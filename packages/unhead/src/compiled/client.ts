import type { CreateLazyHeadOptions, LazyUnhead } from '../lazy'
import type { HeadEntry, HeadEntryOptions, HeadRenderer } from '../types'
import type { CompiledTag } from './types'

type RuntimeTag = Record<string, any>

// Set by the `@unhead/bundler` plugin. Undefined outside it, so each guard reads `typeof` first.
// Each guard stays inline, so the minifier drops the debug code with it.
declare const __UNHEAD_COMPILE_DEBUG__: boolean | undefined

// This chunk imports nothing, so it cannot pull v3 or `toHeadInput` along: a module it
// shared with `lazy/runtime` would become a third chunk. The flags come from `./tags`.
const FLAG_ARRAYABLE = 2
const FLAG_DYNAMIC_VALUES = 4
const FLAG_UNDEFINED_DROPS = 8
const DYNAMIC_VALUE_RE = /(\d+)/g
const ELEMENT_TAG_RE = /^(?:base|meta|link|style|script|noscript)$/
const NATIVE_HOOK_RE = /^dom:(?:beforeRender|rendered)$/
const META_NOREWRITE_RE = /^(?:viewport|description|keywords|robots)$/
const JSON_TYPE_RE = /json$|^importmap$|^speculationrules$/
// `titleTemplate` and `templateParams`, the only compiled tag names that never render
const VIRTUAL_TAG_RE = /[TP]/
const CONTENT_KEYS = { text: 'textContent', html: 'innerHTML' } as const
const PRIORITY_ALIASES: Record<string, number> = { critical: -8, high: -1, low: 2 }

// The id offset of a claim, from `../lazy`
const CLAIM = 1e6

// The capo weights of the warmup rels, with the `high` priority offset of -1
const WARMUP_WEIGHTS: Record<string, number> = { 'preload': 69, 'preconnect': 19, 'dns-prefetch': 89 }
// The attributes `useScript` sets on a warmup link. None of them changes a weight or a dedupe key.
const WARMUP_ATTR_RE = /^(?:rel|href|as|crossorigin|referrerpolicy|fetchpriority|integrity)$/

// `compileWarmup` of `./warmup`, copied so this chunk imports nothing
function compileWarmup(input: any, options?: HeadEntryOptions): any {
  const link = options?.tagPriority === 'high' && input?.link
  if (!link || link.length !== 1 || Object.keys(input).length !== 1)
    return input
  const props: Record<string, string> = {}
  for (const key in link[0]) {
    const value = link[0][key]
    if (value !== undefined) {
      if (typeof value !== 'string' || !WARMUP_ATTR_RE.test(key))
        return input
      props[key] = value
    }
  }
  const weight = WARMUP_WEIGHTS[props.rel!]
  return weight && props.href
    ? [['link', props, weight, `link:${props.rel}:${props.href}`, { tagPriority: 'high' }, 1]]
    : input
}

const sortTags = (a: RuntimeTag, b: RuntimeTag) => a._w === b._w ? a._p - b._p : a._w - b._w

// a `null` patch is empty input to v3, so only `undefined` falls back to the input
const isCompiled = (entry: HeadEntry<any>) => Array.isArray(entry._pending === undefined ? entry.input : entry._pending)

// v3 `hasContent`. A compiled tag value is finite, and a value passes `isRenderableValue`.
const hasContent = (value: unknown) => value === 0 || value

// A list, an object, or a number that is not finite changes how v3 normalizes a value, so only v3 may decide them
const isScalar = (entryValue: unknown) => entryValue == null || typeof entryValue === 'string' || typeof entryValue === 'boolean' || Number.isFinite(entryValue)

// Only the template params plugin and tag transforms may listen to `tags:` hooks, and this
// runtime calls those. Returns the first hook with another listener.
function foreignHook(head: LazyUnhead<any>): string | undefined {
  const hooks = (head.hooks as any)._hooks
  const native = head.plugins.get('template-params')?.hooks as any
  for (const name in hooks) {
    if (hooks[name] && !NATIVE_HOOK_RE.test(name) && (!name.startsWith('tags:') || hooks[name].some((listener: any) => !listener._t && native?.[name] !== listener)))
      return name
  }
}

/**
 * The v3 `dedupeKey(normalizeProps(el)) || hashTag` of a server element, so it equals
 * the dedupe key in compiled tags, including the `[object Set]` a keyless tag hashes for `class`.
 */
function elementKey(el: Element, tag: string): string {
  const props: Record<string, any> = {}
  for (const name of el.getAttributeNames()) {
    const value = el.getAttribute(name)!
    // v3 hashes these as a Set and a Map
    props[name] = name === 'class'
      ? new Set()
      : name === 'style'
        ? new Map()
        : ((value === 'true' || !value) && !name.startsWith('data-') && (tag !== 'meta' || name !== 'content')) || value
  }
  const { rel, charset, hreflang, id } = props
  const key = props['data-hid']
  const meta = props.name ?? props.property ?? props['http-equiv']
  const link = tag === 'link'
  return tag === 'base'
    ? tag
    : link && rel === 'canonical'
      ? rel
      : link && rel === 'alternate' && hreflang
        ? `alternate:${hreflang}`
        : charset
          ? 'charset'
          : tag === 'meta' && meta !== undefined
            ? `meta:${meta}${(meta === true || !meta.includes(':')) && !META_NOREWRITE_RE.test(meta) && key ? `:key:${key}` : ''}`
            : key
              ? `${tag}:key:${key}`
              : id
                ? `${tag}:id:${id}`
                : link && rel && props.href
                  ? `link:${rel}:${props.href}`
                  : el.innerHTML
                    ? `${tag}:content:${el.innerHTML}`
                    : `${tag}:${Object.keys(props).sort().map(name => `${name}:${props[name]}`).join()}`
}

/**
 * Gathers the tags of a list of entries and applies the v3 sort, dedupe, title
 * template, template params, and sanitize rules. Returns nothing if v3 must decide a value.
 */
function resolveCompiledTags(head: LazyUnhead<any>, entries: HeadEntry<any>[]): RuntimeTag[] | undefined {
  const tags: RuntimeTag[] = []
  let plain: unknown = true
  for (const entry of entries) {
    const options = entry.options as Record<string, any>
    ;((entry._pending ?? entry.input) as CompiledTag[]).forEach(([name, props, , _d, extra, _f], i) => {
      const tag: RuntimeTag = { tag: name, props: { ...props as object }, _d, _f, _p: (entry._i << 10) + i, ...extra as object, ...options }
      const { tagPriority, props: { class: classes, style } } = tag
      // the client weight comes from the tag, so one set of compiled tags serves the server and the client
      tag._w = typeof tagPriority === 'number' ? tagPriority : 100 + (PRIORITY_ALIASES[tagPriority] || 0)
      if (_f! & FLAG_DYNAMIC_VALUES) {
        for (const target of [tag.props, tag]) {
          for (const key in target) {
            // v3 keeps a value that is a whole string, so a number stays a number and the content
            // cleanup, which compares by identity, leaves its text
            let whole: unknown
            let entryValue: any
            const text = target[key].replace?.(DYNAMIC_VALUE_RE, (match: string, index: string, _: number, text: string) => {
              entryValue = options.values?.[index as any]
              if (typeof __UNHEAD_COMPILE_DEBUG__ !== 'undefined' && __UNHEAD_COMPILE_DEBUG__ && !isScalar(entryValue))
                head._fullRuntimeReason ||= { _tag: 'Value', entry, index: +index, value: entryValue }
              plain &&= isScalar(entryValue)
              whole = match === text
              return entryValue
            })
            if (!whole) {
              text === undefined || (target[key] = text)
            }
            // the v3 `normalizeProps` rules for a whole value
            else if (entryValue === undefined || (entryValue === null && _f! & FLAG_UNDEFINED_DROPS)) {
              if (entryValue === undefined && _f! & FLAG_UNDEFINED_DROPS)
                return
              delete target[key]
            }
            else if (target === tag || entryValue === null) {
              target[key] = entryValue
            }
            else {
              const str = String(entryValue)
              const isData = key.startsWith('data-')
              target[key] = str === 'true' || !str
                ? isData || (name === 'meta' && key === 'content') ? str : true
                : !entryValue && isData && str === 'false' ? str : entryValue
            }
          }
        }
      }
      if (classes != null)
        tag.props.class = new Set(classes && classes.split(' '))
      if (style != null)
        tag.props.style = new Map(style && style.split(';').map((part: string) => part.split(/:([\s\S]*)/)))
      tags.push(tag)
    })
  }
  if (!plain)
    return

  const tagMap = new Map<string, any>()
  let hasFlatMeta: unknown
  for (const next of tags.sort(sortTags)) {
    const key = next._d
    const prev = tagMap.get(key)
    // htmlAttrs, bodyAttrs, and templateParams merge, and they are the compiled tag names that end in `s`
    if (prev && (next.tagDuplicateStrategy || (next.tag.endsWith('s') || (next.key && next.key === prev.key) ? 'merge' : 0)) === 'merge') {
      const props = { ...prev.props }
      for (const name in next.props) {
        const value = next.props[name]
        props[name] = name === 'style'
          ? new Map([...(prev.props.style || []), ...value])
          : name === 'class' ? new Set([...(prev.props.class || []), ...value]) : value
      }
      tagMap.set(key, { ...next, props })
    }
    else if (prev && next._f & FLAG_ARRAYABLE && (next._p >> 10) === (prev._p >> 10)) {
      tagMap.set(key, Object.assign([prev, next].flat(), next))
      hasFlatMeta = 1
    }
    // sorted, so a later tag only ever ties on weight
    else if (!prev || next._w === prev._w) {
      tagMap.set(key, next)
    }
  }

  const title = tagMap.get('title')
  const template = tagMap.get('titleTemplate')
  let value = template && (head._titleTemplate = template.textContent)
  head._title = title?.textContent
  if (value) {
    if (!head.plugins.has('template-params'))
      value = value.replace('%s', title?.textContent || '')
    tagMap.set(title ? 'title' : 'titleTemplate', { ...title || template, tag: 'title', textContent: value })
  }
  const ctx = { tagMap, tags: [...tagMap.values()].flat() }
  if (hasFlatMeta)
    ctx.tags.sort(sortTags)
  // template params and tag transforms, the only `tags:` listeners a compiled head keeps
  for (const hook of ['tags:beforeResolve', 'tags:resolve', 'tags:afterResolve'])
    head.hooks.callHook(hook as 'tags:resolve', ctx as any)

  return ctx.tags.filter((tag) => {
    const { tag: name, props, innerHTML, textContent } = tag
    if (name === 'script' && (innerHTML || textContent)) {
      const json = JSON_TYPE_RE.test(String(props.type))
      for (const key of ['innerHTML', 'textContent']) {
        const value = tag[key]
        if (value)
          tag[key] = json ? String(value).replace(/</g, '\\u003C') : value.replace?.(/<\/script/g, '<\\/script') ?? value
      }
      // v3 keys a script again after this escape, and the server element holds the escaped text
      if (tag._d.startsWith('script:content:'))
        tag._d = `script:content:${tag.textContent || tag.innerHTML}`
    }
    return !VIRTUAL_TAG_RE.test(name)
      && (Object.keys(props).length || hasContent(innerHTML) || hasContent(textContent))
      && (name !== 'meta' || hasContent(props.content) || props['http-equiv'] || props.charset)
  })
}

/**
 * Builds the renderer of a head that holds only compiled tags. Its state is a real v3 `DomState`
 * with v3 ids and cleanup keys, so a handoff only has to start the v3 renderer.
 */
export async function upgradeHead(head: LazyUnhead<any>, options: CreateLazyHeadOptions, adoptionEntries: () => HeadEntry<any>[], upgrade: (runtime: Promise<unknown>) => Promise<boolean>): Promise<HeadRenderer<any>> {
  ;(await options.lazyPlugins?.())?.forEach(p => head.use(p))
  // A failed load leaves this runtime in place, so the next change tries again
  let v3: Promise<unknown> | undefined
  const loadV3 = () => v3 ||= upgrade(import('../lazy/runtime')).then(loaded => loaded || (v3 = undefined))
  const dom = head.resolvedOptions.document!

  // Returns true when it rendered, and nothing when a load took over. With claims, it is the
  // silent render that adopts the server head. A claim is a copy of a server entry as it was
  // pushed: it tracks the cleanup of the server elements it finds, and writes nothing.
  function draw(entries: HeadEntry<any>[], claimed?: HeadEntry<any>[]): true | undefined {
    // claims resolve first, so the title state comes from the rendered entries
    const claims = claimed ? resolveCompiledTags(head, claimed) : []
    const tags = claims && resolveCompiledTags(head, entries)
    if (!tags) {
      loadV3()
      return
    }
    let state: any = head._dom
    const elements: Map<string, Element> = state?._e || new Map([['htmlAttrs', dom.documentElement], ['bodyAttrs', dom.body]])
    if (!state) {
      state = head._dom = { _d: dom, _t: dom.title, _e: elements, _s: {} } as any
      // v3 removes a server class that the first render drops, so the pushed input is its baseline
      for (const { _o } of entries) {
        for (const [name, props] of Array.isArray(_o) ? _o as CompiledTag[] : []) {
          for (const item of name.endsWith('Attrs') && (props as any).class ? (props as any).class.split(' ') : [])
            state._s[`${name}:attr:class:${item}`] = () => elements.get(name)!.classList.remove(item)
        }
      }
    }
    const previous = state._p = state._s
    const next: Record<string, () => void> = state._s = {}
    // a claim never replaces the cleanup of a rendered tag
    const track = (key: string, fn: () => void, claim?: 1) => {
      if (!claim || !next[key]) {
        next[key] = fn
        delete previous[key]
      }
    }
    const sync = ({ id, $el, tag, claim }: RuntimeTag) => {
      elements.set(id, $el)
      if (!tag.tag.endsWith('Attrs')) {
        for (const name in CONTENT_KEYS) {
          const key = CONTENT_KEYS[name as keyof typeof CONTENT_KEYS]
          const value = tag[key]
          if (value != null && value !== '') {
            if (!claim && value !== $el[key])
              $el[key] = value
            track(`${id}:${name}`, () => $el[key] === value && ($el[key] = ''), claim)
          }
        }
        track(`${id}:el`, () => {
          $el.remove()
          elements.delete(id)
        }, claim)
      }
      for (const name in tag.props) {
        const value = tag.props[name]
        const key = `${id}:attr:${name}`
        if (name === 'class') {
          for (const item of value) {
            track(`${key}:${item}`, () => $el.classList.remove(item), claim)
            claim || $el.classList.contains(item) || $el.classList.add(item)
          }
        }
        else if (name === 'style') {
          for (const [property, text] of value) {
            track(`${key}:${property}`, () => $el.style.removeProperty(property), claim)
            claim || $el.style.setProperty(property, text)
          }
        }
        else if (value !== false && value !== null) {
          if (!claim && $el.getAttribute(name) !== value)
            $el.setAttribute(name, value === true ? '' : String(value))
          track(key, () => $el.removeAttribute(name), claim)
        }
      }
    }

    const renders: RuntimeTag[] = []
    const pending: RuntimeTag[] = []
    for (const [list, claim] of [[tags], [claims, 1]] as [RuntimeTag[], 1?][]) {
      const counts: Record<string, number> = {}
      for (const tag of list) {
        const count = counts[tag._d] || 0
        const ctx: RuntimeTag = { tag, id: count ? `${tag._d}:${count}` : tag._d, shouldRender: true, claim }
        // a rendered meta is only arrayable through its name, so this matches the v3 `_d` guard
        if (tag._f & FLAG_ARRAYABLE)
          counts[tag._d] = count + 1
        claim || renders.push(ctx)
        if (tag.tag !== 'title') {
          ctx.$el = elements.get(ctx.id)
          ctx.$el ? sync(ctx) : pending.push(ctx)
        }
        // A claim skips the title, which a cleanup restores and never removes. The title is a
        // document property with no element to adopt, so only the live draw writes it, as v3
        // writes it once. Adoption tracks its restore, as the v3 render at hydration end does.
        else if (!claim) {
          claimed || (dom.title = tag.textContent)
          track('title:', () => dom.title = state._t)
        }
      }
    }
    if (pending[0]) {
      const tracked = new Set(elements.values())
      for (const el of [...dom.body.children, ...dom.head.children]) {
        const name = el.localName
        if (ELEMENT_TAG_RE.test(name) && !tracked.has(el)) {
          const key = elementKey(el, name)
          let id = key
          let count = 1
          while (elements.has(id))
            id = `${key}:${count++}`
          elements.set(id, el)
        }
      }
      const created: Record<string, Element[]> = { head: [], bodyOpen: [], bodyClose: [] }
      for (const ctx of pending) {
        const found = elements.get(ctx.id)
        if (found || !ctx.claim) {
          ctx.$el = found || dom.createElement(ctx.tag.tag)
          sync(ctx)
          found || (created[ctx.tag.tagPosition || 'head'] ||= []).push(ctx.$el)
        }
      }
      dom.head.append(...created.head!)
      dom.body.prepend(...created.bodyOpen!)
      dom.body.append(...created.bodyClose!)
    }
    for (const key in previous)
      previous[key]!()
    if (!claimed) {
      head.dirty = false
      head.hooks.callHook('dom:rendered', { renders } as any)
    }
    return true
  }

  let timer: ReturnType<typeof setTimeout>
  return () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      const ctx = { shouldRender: true, tags: [] }
      // the first draw creates the DOM state, even with no change since hydration
      if (!dom || (!head.dirty && head._dom))
        return
      head.hooks.callHook('dom:beforeRender', ctx)
      if (!ctx.shouldRender)
        return
      const live = [...head.entries.values()]
      // Rendering the hydrated entries first adopts the server elements of an entry that changed
      // since hydration, so the live entries below remove the stale ones. It waits for the first
      // draw, so a change after the load still adopts. `dirty` means changed since hydration.
      const adopt = !head._dom && head.dirty && adoptionEntries()
      const all = [...live, ...adopt || []]
      for (const entry of all) {
        if (entry._pending === undefined)
          entry.input = compileWarmup(entry.input, entry.options)
      }
      const loose = all.find(entry => !isCompiled(entry))
      const hook = !options.render && !loose && foreignHook(head)
      if (options.render || loose || hook) {
        if (typeof __UNHEAD_COMPILE_DEBUG__ !== 'undefined' && __UNHEAD_COMPILE_DEBUG__) {
          const listeners = (head.hooks as any)._hooks[hook as string]
          head._fullRuntimeReason ||= options.render
            ? { _tag: 'RenderOption' }
            : loose
              ? { _tag: 'Entry', entry: loose }
              : { _tag: 'Hook', hook: hook as string, plugin: [...head.plugins].find(([key, plugin]) => key !== 'template-params' && !plugin.transform && listeners.includes(plugin.hooks?.[hook as string]))?.[0] }
        }
        return loadV3()
      }
      if (!adopt || draw(adopt.filter(entry => entry._i < CLAIM), adopt.filter(entry => entry._i >= CLAIM)))
        draw(live)
    })
  }
}
