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
import { dedupeTags, resolveTitleTemplate, sanitizeTags, syncEntryHookCache } from '../utils/resolve'
import { compileTags } from './compile'
import { DEFAULT_COMPILED_TAGS, isEmpty, renderCompiledHead, reviveTag, settleValues } from './core'
import { ALIAS_PRIORITY_RE, copyValue, FLAG_DYNAMIC_VALUES, FLAG_IDENTITY, toHeadInput } from './tags'
import { buildValueMemo, renderValueMemo } from './valueMemo'

export type { CreateServerHeadOptions, SSRHeadPayload, Unhead } from '../types'
export { compileTags }
export type { CompileOptions, CompileResult } from './compile'
export { dynamicValue } from './tags'
export type { CompiledTag, CompiledTagExtra, CompiledTagProps, CompiledTags, CompiledTagValue } from './types'

/**
 * @experimental
 */
export interface CompiledEntryOptions extends HeadEntryOptions {
  /** Values for the dynamic values of compiled tags. A function runs once, before the first render reads them. */
  values?: readonly unknown[] | (() => readonly unknown[])
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
  /** Hooks of the native `TemplateParamsPlugin`. */
  _tp?: Record<string, any>
  /** The hooks of native plugins, in the order they registered. They reach the store only when something can observe them. */
  _native?: [name: string, listener: (ctx: any) => void][]
  _nativeActive?: boolean
  /** Listeners of built-in plugins that the fast tiers run themselves. */
  _known?: Set<unknown>
}

// The built-in plugins the fast tiers run, with the hooks each must have. Compiled tags hold
// nothing their hooks change, so they run on loose entries only. Template params and
// inferred SEO meta run natively, and a tag with a priority alias takes the full runtime tier.
const BUILT_IN: Record<string, string> = {
  'template-params': 'tags:resolve,tags:afterResolve',
  'infer-seo-meta': 'tags:beforeResolve,tags:afterResolve',
  'flatMeta': 'entries:normalize',
  'deprecations': 'entries:normalize',
  'promises': 'entries:resolve',
  'aliasSorting': 'tags:resolve',
}

// compiled tags rarely sit this deep in a head, so their revived tags are not worth keeping per index
const MAX_CACHED_INDEX = 256
const compiledTagCache = /* @__PURE__ */ new WeakMap<CompiledTags, RuntimeTag[][] | 0>()

function hookStore(head: CompiledHead): HookableCore<any> {
  const store = head._hookStore ||= createHooks<ServerHeadHooks>()
  if (!head._nativeActive) {
    head._nativeActive = true
    head._native?.forEach(([name, listener]) => store.hook(name as any, listener))
  }
  return store
}

// The hooks v3 `resolveTags` and `renderSSRHead` call: `entries:normalize`,
// `entries:resolve`, every `tags:` hook, `ssr:beforeRender`, `ssr:render`, and
// `ssr:rendered`. A listener for any other hook, such as the `script:updated` one
// `useScript` adds, cannot change a render.
const RENDER_HOOK_RE = /^(?:entries:[nr]|tags:|ssr:[br])/

/** The first render hook with a listener that the fast tiers cannot run. */
function hasListeners(head: CompiledHead): string | undefined {
  const hooks = (head._hookStore as any)?._hooks
  for (const name in hooks) {
    if (RENDER_HOOK_RE.test(name) && hooks[name]?.some((listener: any) => !head._known?.has(listener)))
      return name
  }
}

// The compiled tags of static input that a native plugin pushes, so the memo still serves
// the head. Every head pushes the same input, so it compiles once.
const nativeInputs: Record<string, CompiledTags | false> = {}
function compileNativeInput(input: unknown): unknown {
  const id = JSON.stringify(input)
  let tags = nativeInputs[id]
  if (tags === undefined) {
    const result = compileTags(input)
    tags = nativeInputs[id] = result._tag === 'Ok' && result.tags
  }
  return tags || input
}

function usePlugin(head: CompiledHead, plugin: HeadPluginInput) {
  const key = plugin.key!
  // Nuxt always registers template params, and SEO modules register inferred SEO meta. A head
  // runs their hooks natively until something can observe them. Matching by key keeps the
  // plugins out of a bundle that never uses them.
  if (typeof plugin === 'function' && (key === 'template-params' || key === 'infer-seo-meta') && !head.plugins.has(key)) {
    const push = head.push
    head.push = (input, options) => push(compileNativeInput(input) as any, options)
    let resolved: any
    try {
      resolved = plugin(head)
    }
    finally {
      head.push = push
    }
    head.plugins.set(key, resolved)
    const hooks = resolved.hooks || {}
    for (const name in hooks)
      (head._native ||= []).push([name, hooks[name]])
    // another plugin with this key has hooks this entry cannot run natively
    head._v3 ||= Object.keys(hooks).join() !== BUILT_IN[key]
    if (key === 'template-params') {
      head._tp = hooks
    }
    else {
      head._infer = hooks
      // Only the plugin knows whether it has an `ogTitle` or `ogDescription` function. A function
      // may change one text and leave the next, so no test of its output can clear it.
      head._inferMemo = !head._v3 && !!hooks['tags:beforeResolve']?._plain
    }
    // Once the store exists, a reader may hold it and add a listener later, so the
    // hooks register now and keep the v3 order. The fast tiers skip them as native.
    if (head._nativeActive) {
      for (const name in hooks)
        head._hookStore!.hook(name as any, hooks[name])
    }
    else if (head._v3 || head._hookStore) {
      hookStore(head)
    }
  }
  else {
    registerPlugin(head, plugin)
    // The key changes how v3 applies a title template, but this plugin has no native rules. The
    // object form of a native plugin, such as `InferSeoMetaPlugin()(head)`, has none either.
    head._v3 ||= (head.plugins.has('template-params') && !head._tp) || (head.plugins.has('infer-seo-meta') && !head._infer)
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

// v3 `valuesToTags` of utils/resolve, which stays unexported there so the v3 bundles keep their bytes
function valuesToTags(ctx: { tagMap: Map<string, any>, tags: HeadTag[] }, sortFlatMeta: boolean) {
  const tags = ctx.tags
  let w = 0
  for (const value of ctx.tagMap.values()) {
    if (Array.isArray(value)) {
      for (const tag of value) tags[w++] = tag
    }
    else {
      tags[w++] = value
    }
  }
  tags.length = w
  if (sortFlatMeta)
    tags.sort((a: any, b: any) => a._w === b._w ? a._p - b._p : a._w - b._w)
}

function hasParam(value: any): boolean {
  return value?.includes?.('%')
}

// Runs the real `TemplateParamsPlugin` hooks. A hook mutates tags in place and tags
// may be shared across renders, so it only sees copies of the tags a param can change.
// The params become `head._templateParams`, so their nested values are copied too.
// Runs the real `tags:beforeResolve` hook of `InferSeoMetaPlugin`. It sets the content of the
// inferred og tags in place, and tags may be shared across renders, so it sees copies of them.
function applyNativeInferBeforeResolve(ctx: { tagMap: Map<string, any>, tags: RuntimeTag[] }, hooks: Record<string, (ctx: any) => void>) {
  for (const id of ['meta:og:title', 'meta:og:description']) {
    const tag = ctx.tagMap.get(id)
    if (tag && !Array.isArray(tag)) {
      const copy = { ...tag, props: { ...tag.props } }
      ctx.tagMap.set(id, copy)
      ctx.tags[ctx.tags.indexOf(tag)] = copy
    }
  }
  hooks['tags:beforeResolve']!(ctx)
}

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
  n: { m: {} },
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
    // The v3 hook order: `tags:beforeResolve`, `tags:resolve`, then `tags:afterResolve`. The two
    // `tags:afterResolve` listeners touch different tags, so their order does not matter.
    const { _tp, _infer } = head as CompiledHead
    if (_infer)
      applyNativeInferBeforeResolve(ctx, _infer)
    if (_tp)
      applyNativeTemplateParams(ctx.tags, ctx.tagMap, _tp)
    if (_infer)
      _infer['tags:afterResolve']!(ctx)
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
    settleValues(entry)
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

// v3 updates the same entry on patch, so a reader that holds it sees the new input.
// A loose entry that becomes a compiled entry moves onto the compiled entry prototype, which is rare.
function setInput(entry: CompiledEntry & { _in?: unknown }, input: unknown, values: CompiledEntryOptions['values']) {
  entry._tags = entry._precomputedTags = undefined
  if (Array.isArray(input)) {
    if (Object.getPrototypeOf(entry) !== COMPILED_ENTRY) {
      delete (entry as { input?: unknown }).input
      Object.setPrototypeOf(entry, COMPILED_ENTRY)
    }
    entry._compiled = input
    entry._values = values as CompiledEntry['_values']
    entry._in = undefined
  }
  else {
    entry.input = input
  }
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
    entry._values = options?.values as CompiledEntry['_values']
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
    // v3 updates the same entry, so it keeps its place in the dedupe order and a
    // reader that holds it sees the new input
    patch(next: unknown, patchOptions?: CompiledEntryOptions) {
      setInput(entry, next, patchOptions?.values)
      head.entries.set(_i, entry)
    },
  }
}

// Why a render must take the full v3 runtime, or nothing when a fast tier can render it
function fullTierReason(head: CompiledHead, options?: RenderSSRHeadOptions): string | undefined {
  if (head._v3 !== false)
    return 'a custom tag weight, a dynamic prop resolver, or a plugin that the head cannot run natively'
  if (options?.resolvedTags)
    return 'the resolvedTags render option'
  if (options?.tagWeight && options.tagWeight !== capoTagWeight)
    return 'a custom tagWeight render option'
  const hook = hasListeners(head)
  if (hook)
    return `a listener on the ${hook} hook`
}

/**
 * The render tier of a compiled server head, and why it is not a faster one.
 *
 * @experimental
 */
export type RenderTier
  = | { _tag: 'Memo' }
    | { _tag: 'Fast', reason: string }
    | { _tag: 'Full', reason: string }

/**
 * Tells which tier the next render of a head takes. `Memo` serves the head from the memo
 * when no value could change a v3 decision. `Fast` renders compiled tags without the full
 * runtime. `Full` runs the full v3 runtime.
 *
 * @experimental
 */
export function getRenderTier(head: Unhead<any>, options?: RenderSSRHeadOptions): RenderTier {
  const compiledHead = head as CompiledHead
  const full = compiledHead._acceptsCompiled ? fullTierReason(compiledHead, options) : 'the head does not come from a compiled server entry'
  if (full)
    return { _tag: 'Full', reason: full }
  let loose = 0
  for (const entry of head.entries.values() as Iterable<CompiledEntry>) {
    if (!entry._compiled || entry._tags || entry._pending !== undefined || !isEmpty(entry.options))
      loose++
  }
  if (loose)
    return { _tag: 'Fast', reason: `${loose} ${loose === 1 ? 'entry is' : 'entries are'} not compiled tags with no options` }
  if (compiledHead._infer && !compiledHead._inferMemo)
    return { _tag: 'Fast', reason: 'InferSeoMetaPlugin has an ogTitle or ogDescription function' }
  return { _tag: 'Memo' }
}

/**
 * Renders a head through the fastest tier its entries, hooks, and options allow.
 * The result is byte-identical to the v3 `renderSSRHead`.
 *
 * @experimental
 */
export function renderSSRHead(head: Unhead<any>, options?: RenderSSRHeadOptions): SSRHeadPayload {
  head.entries.forEach(settleValues)
  try {
    if (!fullTierReason(head as CompiledHead, options))
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
  head._acceptsCompiled = 1
  head._hookStore = options.hooks && createHooks<ServerHeadHooks>(options.hooks)
  if (!options.disableDefaults)
    head.push(DEFAULT_COMPILED_TAGS)
  options.init?.forEach(input => input && head.push(input))
  options.plugins?.forEach(head.use)
  return head as unknown as CompiledServerUnhead<T>
}
