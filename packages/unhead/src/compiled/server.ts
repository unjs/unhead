import type { HookableCore } from 'hookable'
import type { CreateServerHeadOptions, HeadEntryOptions, HeadPluginInput, HeadTag, RenderSSRHeadOptions, ResolvableHead, ServerHeadHooks, SSRHeadPayload, Unhead } from '../types'
import type { CompiledEntry, CompiledRenderer, CompiledTagsHead, RuntimeTag } from './core'
import type { CompiledTag, CompiledTags } from './types'
import { serverPropResolver } from '../server/createHead'
import { createServerRenderer as createV3Renderer } from '../server/renderSSRHead'
import { capoTagWeight } from '../server/sort'
import { propsToString } from '../server/util/propsToString'
import { tagToString } from '../server/util/tagToString'
import { registerPlugin } from '../unhead'
import { DupeableTags } from '../utils/const'
import { dedupeKey, hashTag } from '../utils/dedupe'
import { createHooks } from '../utils/hooks'
import { normalizeEntryToTags, normalizeStyleClassProps } from '../utils/normalize'
import { dedupeTags, resolveTitleTemplate, sanitizeTags, syncEntryHookCache, valuesToTags } from '../utils/resolve'
import { compileTags } from './compile'
import { DEFAULT_COMPILED_TAGS, isEmpty, renderCompiledHead, reviveTag } from './core'
import { ALIAS_PRIORITY_RE, copyValue, FLAG_DYNAMIC_VALUES, FLAG_IDENTITY, toHeadInput } from './tags'
import { buildValueMemo, renderValueMemo } from './valueMemo'

export { prepareTemplate } from '../parser'
export type { PreparedTemplate } from '../parser'
export type { ServerUnhead } from '../server/createHead'
export { capoTagWeight } from '../server/sort'
export { transformHtmlTemplate, transformHtmlTemplateRaw } from '../server/transformHtmlTemplate'
export { escapeHtml, propsToString, ssrRenderTags, tagToString } from '../server/util'
export type { CreateServerHeadOptions, SSRHeadPayload, Unhead } from '../types'
export type { CompiledTag, CompiledTagExtra, CompiledTagProps, CompiledTags, CompiledTagValue } from './types'

/**
 * @experimental
 */
export interface CompiledEntryOptions extends HeadEntryOptions {
  /** Values for the dynamic values of compiled tags. */
  values?: readonly unknown[]
}

/**
 * `CreateServerHeadOptions` with `init` entries that may be compiled tags.
 *
 * @experimental
 */
export interface CompiledServerHeadOptions extends Omit<CreateServerHeadOptions, 'init'> {
  init?: (ResolvableHead | CompiledTags | undefined | false)[]
}

/**
 * A server head that accepts compiled tags as well as loose input.
 *
 * @experimental
 */
export interface CompiledServerUnhead<T = ResolvableHead> extends Unhead<T | CompiledTags, SSRHeadPayload> {
  hooks: HookableCore<ServerHeadHooks>
  push: (input: T | CompiledTags, options?: CompiledEntryOptions) => any
}

type CompiledHead = CompiledTagsHead & {
  /** A custom weight or a dynamic prop resolver: only the full runtime can apply it. */
  _v3: boolean
  _hookStore?: HookableCore<any>
  /** Hooks of the native `TemplateParamsPlugin`. They register only when something can observe them. */
  _tp?: Record<string, any>
  _tpActive?: boolean
  /** Listeners of built-in plugins that the fast tiers run themselves. */
  _known?: Set<unknown>
}

// The built-in plugins the fast tiers run, with the hooks each must have. Compiled tags hold
// nothing their hooks change, so they run on loose entries only. Template params run
// natively, and a tag with a priority alias takes the full runtime tier.
const BUILT_IN: Record<string, string> = {
  'template-params': 'tags:resolve,tags:afterResolve',
  'flatMeta': 'entries:normalize',
  'deprecations': 'entries:normalize',
  'promises': 'entries:resolve',
  'aliasSorting': 'tags:resolve',
}

// compiled tags rarely sit this deep in a head, so their revived tags are not worth keeping per index
const MAX_CACHED_INDEX = 256
const compiledTagCache = /* @__PURE__ */ new WeakMap<CompiledTags, RuntimeTag[][] | 0>()
let prepared: WeakMap<object, CompiledTags | 0> | undefined

function hookStore(head: CompiledHead): HookableCore<any> {
  const store = head._hookStore ||= createHooks<ServerHeadHooks>()
  if (head._tp && !head._tpActive) {
    head._tpActive = true
    for (const name in head._tp)
      store.hook(name as any, head._tp[name])
  }
  return store
}

// The hooks v3 `resolveTags` and `renderSSRHead` call: `entries:normalize`,
// `entries:resolve`, every `tags:` hook, `ssr:beforeRender`, `ssr:render`, and
// `ssr:rendered`. A listener for any other hook, such as the `script:updated` one
// `useScript` adds, cannot change a render.
const RENDER_HOOK_RE = /^(?:entries:[nr]|tags:|ssr:[br])/

function hasListeners(head: CompiledHead): boolean {
  const hooks = (head._hookStore as any)?._hooks
  for (const name in hooks) {
    if (RENDER_HOOK_RE.test(name) && hooks[name]?.some((listener: unknown) => !head._known?.has(listener)))
      return true
  }
  return false
}

function usePlugin(head: CompiledHead, plugin: HeadPluginInput) {
  const key = plugin.key!
  // Nuxt always registers this plugin. A head runs its hooks natively until something
  // can observe them. Matching by key keeps the plugin out of a bundle that never uses it.
  if (typeof plugin === 'function' && key === 'template-params' && !head.plugins.has(key)) {
    const resolved = plugin(head) as any
    head.plugins.set(key, resolved)
    head._tp = resolved.hooks
    // another plugin with this key has hooks this entry cannot run natively
    head._v3 ||= Object.keys(resolved.hooks).join() !== BUILT_IN[key]
    // Once the store exists, a reader may hold it and add a listener later, so the
    // hooks register now and keep the v3 order. The fast tiers skip them as native.
    if (head._v3 || head._hookStore)
      hookStore(head)
  }
  else {
    registerPlugin(head, plugin)
    // the key changes how v3 applies a title template, but this plugin has no native rules
    head._v3 ||= head.plugins.has('template-params') && !head._tp
  }
  // matched by key and hook names, as for template params, so no plugin is bundled
  const resolved = head.plugins.get(key)
  if (resolved && BUILT_IN[key] === Object.keys(resolved.hooks || {}).join()) {
    for (const name in resolved.hooks)
      (head._known ||= new Set()).add(resolved.hooks[name as keyof typeof resolved.hooks])
  }
}

// v3 keeps class and style as a Set and a Map. The props are a deep copy, so a tag
// never holds a nested template param of the compiled tags
function revive(compiledTag: CompiledTag, p: number, resolve?: (value: string, key: string | 0, tag: string) => unknown): RuntimeTag {
  const tag = reviveTag(compiledTag, p, resolve)
  const props = tag.props = copyValue(tag.props)
  for (const key of ['class', 'style'] as const) {
    if (tag.tag !== 'templateParams' && typeof props[key] === 'string')
      props[key] = normalizeStyleClassProps(key, props[key])
  }
  return tag
}

// The revived tags of compiled tags with no dynamic values at one entry index. 0 in the cache marks compiled tags
// with dynamic values. The fast tiers share them across renders and heads, with their HTML
// cached on them. v3 hands its tags to hooks and to `resolveTags` readers, so each
// head gets its own, in the shape v3 normalize gives: no `_d` and a hash `_h`
// without an identity, and the key as `_h` of a tag that may repeat.
function compiledTagsAt(entry: CompiledEntry, v3?: boolean): RuntimeTag[] | undefined {
  const compiledTags = entry._compiled!
  let list = compiledTagCache.get(compiledTags)
  if (list === undefined)
    compiledTagCache.set(compiledTags, list = compiledTags.some(compiledTag => compiledTag[5]! & FLAG_DYNAMIC_VALUES) ? 0 : [])
  if (!list)
    return
  let tags = v3 ? undefined : list[entry._i]
  if (!tags) {
    tags = compiledTags.map((compiledTag, i) => {
      const tag = revive(compiledTag, (entry._i << 10) + i)
      if (!v3) {
        tag._c = 1
      }
      else if (!(compiledTag[5]! & FLAG_IDENTITY)) {
        tag._h = tag._d
        tag._d = undefined
      }
      else if (tag.key && DupeableTags.has(tag.tag)) {
        tag._h = tag.key
      }
      return tag
    })
    if (!v3 && entry._i < MAX_CACHED_INDEX)
      list[entry._i] = tags
  }
  return tags
}

// v3 `resolveTags` takes these through its precomputed slot, which it already skips
// for an entry hook, a weight override, and entry options. A head weight or a dynamic
// resolver would change the tags, so then nothing is supplied.
function supplyV3CompiledTags(head: CompiledHead) {
  const { _tagWeight, propResolvers } = head.resolvedOptions
  if (_tagWeight !== capoTagWeight || propResolvers?.some(resolver => !resolver._static))
    return
  for (const entry of head.entries.values() as Iterable<CompiledEntry>) {
    if (entry._compiled && !entry._precomputedTags)
      entry._precomputedTags = compiledTagsAt(entry, true) as HeadTag[] | undefined
  }
}

// v3 normalize, with the `entries:normalize` call of v3. Only built-in listeners reach here.
function looseTags(entry: CompiledEntry, head: CompiledHead): RuntimeTag[] {
  if (entry._tags)
    return entry._tags
  const ctx = { tags: normalizeEntryToTags(entry.input, head.resolvedOptions.propResolvers || []), entry }
  if (!isEmpty(entry.options)) {
    for (const tag of ctx.tags)
      Object.assign(tag, entry.options)
  }
  head._hookStore?.callHook('entries:normalize', ctx)
  const tags = ctx.tags
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i]!
    tag._w = capoTagWeight(tag)
    tag._p = (entry._i << 10) + i
    tag._d = dedupeKey(tag)
    if (!tag._d)
      tag._h = hashTag(tag)
  }
  entry._tags = tags
  return tags
}

function hasParam(value: any): boolean {
  return value?.includes?.('%')
}

// Runs the real `TemplateParamsPlugin` hooks. A hook mutates tags in place and tags
// may be shared across renders, so it only sees copies of the tags a param can change.
// The params become `head._templateParams`, so their nested values are copied too.
function applyNativeTemplateParams(tags: RuntimeTag[], tagMap: Map<string, any>, hooks: Record<string, any>) {
  const changing: RuntimeTag[] = []
  const paramsTag = tagMap.get('templateParams')
  if (paramsTag)
    tagMap.set('templateParams', { ...paramsTag, props: copyValue(paramsTag.props) })
  const title = tagMap.get('title')
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i]!
    const { props } = tag
    if (tag === title || hasParam(tag.textContent) || hasParam(tag.innerHTML) || hasParam(props.content) || hasParam(props.href) || hasParam(props.lang)) {
      const copy = tags[i] = { ...tag, props: { ...props } }
      changing.push(copy)
      if (tag === title)
        tagMap.set('title', copy)
    }
  }
  hooks['tags:resolve']({ tagMap, tags: changing })
  hooks['tags:afterResolve']({ tagMap })
}

const renderer: CompiledRenderer = {
  n: { m: [] },
  t(tag) {
    // a spread copy keeps `_src`, and a copy may hold new values
    if (tag._src === tag)
      return tag._html
    let html: string
    const { innerHTML } = tag
    // v3 escapes script text only at a `<`, so a payload with none skips both regex scans
    if (tag.tag === 'script' && innerHTML && typeof innerHTML === 'string' && tag.textContent == null && !innerHTML.includes('<')) {
      html = `<script${propsToString(tag.props)}>${innerHTML}</script>`
    }
    else {
      const clean = sanitizeTags([tag as HeadTag])[0]
      html = clean ? tagToString(clean) : ''
    }
    if (tag._c) {
      tag._src = tag
      tag._html = html
    }
    return html
  },
  a: propsToString,
  c(compiledTagsHead) {
    const head = compiledTagsHead as CompiledHead
    const store = head._hookStore
    // a change to the entry hooks invalidates what they normalized, as in v3
    syncEntryHookCache(head, (store as any)?._hooks || {})
    const lists: (RuntimeTag[] | CompiledEntry)[] = []
    const loose: CompiledEntry[] = []
    for (const entry of head.entries.values() as Iterable<CompiledEntry>) {
      if (entry._pending !== undefined) {
        entry.input = entry._pending
        entry._pending = entry._tags = entry._precomputedTags = undefined
      }
      lists.push((entry._compiled && !entry._tags && isEmpty(entry.options) && compiledTagsAt(entry)) || loose[loose.push(entry) - 1]!)
    }
    // the v3 call, with only the entries a listener can change: compiled tags hold no promise
    store?.callHook('entries:resolve', { entries: loose, tagMap: new Map(), tags: [] })
    const alias = head.plugins.has('aliasSorting')
    const tags: RuntimeTag[] = []
    for (const item of lists) {
      // an entry the listener removed is left out, as in v3
      const list = Array.isArray(item) ? item : loose.includes(item) ? looseTags(item, head) : []
      for (const tag of list) {
        // only v3 runs `AliasSortingPlugin`, and compile refuses an alias in compiled tags
        if (alias && tag.tagPriority && ALIAS_PRIORITY_RE.test(tag.tagPriority))
          throw renderer
        tags.push(tag)
      }
    }
    return tags
  },
  r(tags, head) {
    const ctx = { tagMap: new Map(), tags: tags as HeadTag[] }
    const hasFlatMeta = dedupeTags(ctx)
    resolveTitleTemplate(ctx, head)
    valuesToTags(ctx, hasFlatMeta)
    if ((head as CompiledHead)._tp)
      applyNativeTemplateParams(ctx.tags, ctx.tagMap, (head as CompiledHead)._tp!)
    return ctx.tags
  },
  b: (head, omitLineBreaks, self) => buildValueMemo(head, omitLineBreaks, self, revive),
  f: renderValueMemo,
}

// The `input` of a compiled entry is rebuilt on first read. It lives on a shared prototype
// because accessors in an object literal cost more per push than the rest of the push,
// and `Object.create` because a `__proto__` literal costs four times as much again.
const COMPILED_ENTRY = {
  get input(): unknown {
    const entry = this as unknown as CompiledEntry & { _in: unknown }
    return entry._compiled ? entry._in ||= toHeadInput(entry._compiled, entry._values) : entry._in
  },
  set input(value: unknown) {
    const entry = this as unknown as CompiledEntry & { _in: unknown }
    entry._compiled = entry._values = entry._precomputedTags = undefined
    entry._in = value
  },
}

// Shared by every compiled head. A per-head `Object.defineProperty` would turn each head
// into a dictionary object, which made `createHead` cost five times the v3 one.
const COMPILED_HEAD = {
  // any reader of `head.hooks` may run the full runtime, which needs the real listeners
  get hooks(): HookableCore<any> {
    return hookStore(this as unknown as CompiledHead)
  },
}

function addEntry(head: Unhead<any, any>, input: unknown, options?: CompiledEntryOptions): any {
  const _i = options?._index ?? head._entryCount++
  const entryOptions: Record<string, unknown> = {}
  for (const key in options) {
    if (key !== 'head' && key !== 'onRendered' && key !== '_index' && key !== 'values')
      entryOptions[key] = options[key as keyof CompiledEntryOptions]
  }
  let entry: CompiledEntry
  if (Array.isArray(input)) {
    entry = Object.create(COMPILED_ENTRY)
    entry._i = _i
    entry.options = entryOptions
    entry._compiled = input
    entry._values = options?.values
  }
  else {
    entry = { _i, input, options: entryOptions, _compiled: undefined, _values: undefined }
  }
  head.entries.set(_i, entry)
  return {
    _i,
    dispose() {
      head.entries.delete(_i)
    },
    // v3 keeps the index, so the entry keeps its place in the dedupe order
    patch: (next: unknown, patchOptions?: CompiledEntryOptions) => addEntry(head, next, { ...entryOptions, ...patchOptions, _index: _i }),
  }
}

function usesV3Pipeline(head: CompiledHead, options?: RenderSSRHeadOptions): boolean {
  return head._v3 !== false
    || !!options?.resolvedTags
    || (!!options?.tagWeight && options.tagWeight !== capoTagWeight)
    || hasListeners(head)
}

/**
 * Renders a head through the fastest tier its entries, hooks, and options allow.
 * The result is byte-identical to the v3 `renderSSRHead`.
 *
 * @experimental
 */
export function renderSSRHead(head: Unhead<any>, options?: RenderSSRHeadOptions): SSRHeadPayload {
  try {
    if (!usesV3Pipeline(head as CompiledHead, options))
      return renderCompiledHead(head as CompiledTagsHead, options?.omitLineBreaks, renderer)
  }
  catch (error) {
    // A loose tag has a priority alias. v3 calls `entries:resolve` a second time in this
    // render, and reuses the loose tags, so `entries:normalize` still runs once per entry.
    if (error !== renderer)
      throw error
  }
  supplyV3CompiledTags(head as CompiledHead)
  return createV3Renderer(options)(head)
}

/**
 * @experimental
 */
export function createServerRenderer(options: RenderSSRHeadOptions = {}): (head: Unhead<any>) => SSRHeadPayload {
  return head => renderSSRHead(head, options)
}

/**
 * Compiles static head input once and returns compiled tags when it can, otherwise the
 * original input. Call it at process scope: the input object is the cache key, and it
 * must not change afterwards. For input built per request, keep `compileTags` results
 * on your own renderer instead, so no module holds request-derived state.
 *
 * @experimental
 */
export function prepareHeadInput<T extends object>(input: T): T | CompiledTags {
  if (Array.isArray(input))
    return input
  const cache = prepared ||= new WeakMap()
  let compiledTags = cache.get(input)
  if (compiledTags === undefined) {
    const compiled = compileTags(input)
    compiledTags = compiled._tag === 'Ok' ? compiled.tags : 0
    cache.set(input, compiledTags)
  }
  return compiledTags || input
}

/**
 * Creates a server head that takes compiled tags from `compileTags` or the bundler.
 * `head.push(compiledTags, { values })` adds compiled tags. Loose input and every v3 hook keep working.
 *
 * @experimental
 */
/* @__NO_SIDE_EFFECTS__ */
export function createHead<T = ResolvableHead>(options: CompiledServerHeadOptions = {}): CompiledServerUnhead<T> {
  const tagWeight = options.tagWeight || capoTagWeight
  const renderOptions = { tagWeight, omitLineBreaks: options.omitLineBreaks }
  // `createUnhead` fields, in one order, so every head shares one shape
  const head: CompiledHead = Object.create(COMPILED_HEAD)
  head._entryCount = 1
  head._h = 0
  head.plugins = new Map()
  head.resolvedOptions = {
    _tagWeight: tagWeight,
    // @ts-expect-error untyped
    document: false,
    experimentalStreamKey: options.experimentalStreamKey,
    propResolvers: [...(options.propResolvers || []), serverPropResolver],
  }
  head.ssr = true
  head.entries = new Map()
  head.render = () => renderSSRHead(head, renderOptions)
  head.use = plugin => usePlugin(head, plugin)
  head.push = (input: unknown, entryOptions?: HeadEntryOptions) => addEntry(head, input, entryOptions)
  head._v3 = tagWeight !== capoTagWeight || !!options.propResolvers?.some(resolver => !resolver._static)
  head._hookStore = options.hooks && createHooks<ServerHeadHooks>(options.hooks)
  if (!options.disableDefaults)
    head.push(DEFAULT_COMPILED_TAGS)
  options.init?.forEach(input => input && head.push(input))
  options.plugins?.forEach(head.use)
  return head as unknown as CompiledServerUnhead<T>
}
