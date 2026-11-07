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
import { dedupeKey, hashTag } from '../utils/dedupe'
import { createHooks } from '../utils/hooks'
import { normalizeEntryToTags, normalizeStyleClassProps } from '../utils/normalize'
import { dedupeTags, resolveTitleTemplate, sanitizeTags, valuesToTags } from '../utils/resolve'
import { compileTags } from './compile'
import { DEFAULT_COMPILED_TAGS, isEmpty, renderCompiledHead, reviveTag } from './core'
import { FLAG_DYNAMIC_VALUES, toHeadInput } from './tags'
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
  /** A custom weight or a dynamic prop resolver: only the v3 pipeline can apply it. */
  _v3: boolean
  _hookStore?: HookableCore<any>
  /** Hooks of the native `TemplateParamsPlugin`. They register only when something can observe them. */
  _tp?: Record<string, any>
  _tpActive?: boolean
}

// compiled tags rarely sit this deep in a head, so their revived tags are not worth keeping per index
const MAX_CACHED_INDEX = 256
const compiledTagCache = /* @__PURE__ */ new WeakMap<CompiledTags, RuntimeTag[][]>()
// a key per route list stays far below this, and a key built from request data stops here
const MAX_PREPARED_KEYS = 1024
let prepared: WeakMap<object, CompiledTags | 0> | undefined
let preparedByKey: Map<string, CompiledTags | 0> | undefined

function hookStore(head: CompiledHead): HookableCore<any> {
  const store = head._hookStore ||= createHooks<ServerHeadHooks>()
  if (head._tp && !head._tpActive) {
    head._tpActive = true
    for (const name in head._tp)
      store.hook(name as any, head._tp[name])
  }
  return store
}

function hasListeners(head: CompiledHead, ignoreNative: boolean): boolean {
  const hooks = (head._hookStore as any)?._hooks
  const native = ignoreNative ? head._tp : undefined
  for (const name in hooks) {
    const listeners = hooks[name]
    if (listeners?.length && !(native && listeners.length === 1 && listeners[0] === native[name]))
      return true
  }
  return false
}

function usePlugin(head: CompiledHead, plugin: HeadPluginInput) {
  // Nuxt always registers this plugin. A head runs its hooks natively until something
  // can observe them. Matching by key keeps the plugin out of a bundle that never uses it.
  if (typeof plugin === 'function' && plugin.key === 'template-params' && !head.plugins.has(plugin.key)) {
    const resolved = plugin(head) as any
    head.plugins.set(plugin.key, resolved)
    head._tp = resolved.hooks
    // another plugin with this key has hooks this entry cannot run natively
    let count = 0
    for (const _ in resolved.hooks)
      count++
    head._v3 ||= count !== 2 || !resolved.hooks['tags:resolve'] || !resolved.hooks['tags:afterResolve']
    // a listener that registered first runs first, as it does in v3
    if (head._v3 || hasListeners(head, false))
      hookStore(head)
    return
  }
  registerPlugin(head, plugin)
  // the key changes how v3 applies a title template, but this plugin has no native rules
  head._v3 ||= head.plugins.has('template-params') && !head._tp
}

// v3 keeps class and style as a Set and a Map
function toV3Tag(tag: RuntimeTag): RuntimeTag {
  const { class: classes, style } = tag.props
  if (tag.tag !== 'templateParams' && (typeof classes === 'string' || typeof style === 'string')) {
    tag.props = { ...tag.props }
    if (typeof classes === 'string')
      tag.props.class = normalizeStyleClassProps('class', classes)
    if (typeof style === 'string')
      tag.props.style = normalizeStyleClassProps('style', style)
  }
  return tag
}

function revive(compiledTag: CompiledTag, p: number, resolve?: (value: string, key: string | 0, tag: string) => unknown): RuntimeTag {
  return toV3Tag(reviveTag(compiledTag, p, resolve))
}

// Tags compiled tags with no dynamic values shares across renders. Compiled tags with dynamic values takes the loose
// path through its rebuilt input, so v3 rules decide each value.
function compiledTagsAt(entry: CompiledEntry): RuntimeTag[] | undefined {
  const compiledTags = entry._compiled!
  let list = compiledTagCache.get(compiledTags)
  if (!list)
    compiledTagCache.set(compiledTags, list = [])
  let tags = list[entry._i]
  if (!tags) {
    if (compiledTags.some(compiledTag => compiledTag[5]! & FLAG_DYNAMIC_VALUES))
      return
    tags = compiledTags.map((compiledTag, i) => {
      const tag = revive(compiledTag, (entry._i << 10) + i)
      tag._c = 1
      return tag
    })
    if (entry._i < MAX_CACHED_INDEX)
      list[entry._i] = tags
  }
  return tags
}

function looseTags(entry: CompiledEntry, head: CompiledTagsHead): RuntimeTag[] {
  if (entry._tags)
    return entry._tags
  const hasOptions = !isEmpty(entry.options)
  if (entry._precomputedTags && !hasOptions)
    return entry._precomputedTags
  const tags: HeadTag[] = normalizeEntryToTags(entry.input, head.resolvedOptions.propResolvers || [])
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i]!
    if (hasOptions)
      Object.assign(tag, entry.options)
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
function applyNativeTemplateParams(tags: RuntimeTag[], tagMap: Map<string, any>, hooks: Record<string, any>) {
  const changing: RuntimeTag[] = []
  const paramsTag = tagMap.get('templateParams')
  if (paramsTag)
    tagMap.set('templateParams', { ...paramsTag, props: { ...paramsTag.props } })
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
    const clean = sanitizeTags([tag as HeadTag])[0]
    const html = clean ? tagToString(clean) : ''
    if (tag._c) {
      tag._src = tag
      tag._html = html
    }
    return html
  },
  a: propsToString,
  c(head) {
    const entries = head.entries as Map<number, CompiledEntry>
    // an entry hook that was removed invalidates what it normalized, as in v3
    if (head._h) {
      head._h = 0
      for (const entry of entries.values())
        entry._tags = undefined
    }
    const tags: RuntimeTag[] = []
    for (const entry of entries.values()) {
      if (entry._pending !== undefined) {
        entry.input = entry._pending
        entry._pending = entry._tags = entry._precomputedTags = undefined
      }
      const list = (entry._compiled && !entry._tags && isEmpty(entry.options) && compiledTagsAt(entry)) || looseTags(entry, head)
      for (let i = 0; i < list.length; i++)
        tags.push(list[i]!)
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
    entry._compiled = entry._values = undefined
    entry._in = value
  },
}

// Shared by every compiled head. A per-head `Object.defineProperty` would turn each head
// into a dictionary object, which made `createHead` cost five times the v3 one.
const COMPILED_HEAD = {
  // any reader of `head.hooks` may run the v3 pipeline, which needs the real listeners
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
    || hasListeners(head, true)
}

/**
 * Renders a head through the fastest tier its entries, hooks, and options allow.
 * The result is byte-identical to the v3 `renderSSRHead`.
 *
 * @experimental
 */
export function renderSSRHead(head: Unhead<any>, options?: RenderSSRHeadOptions): SSRHeadPayload {
  return usesV3Pipeline(head as CompiledHead, options)
    ? createV3Renderer(options)(head)
    : renderCompiledHead(head as CompiledTagsHead, options?.omitLineBreaks, renderer)
}

/**
 * @experimental
 */
export function createServerRenderer(options: RenderSSRHeadOptions = {}): (head: Unhead<any>) => SSRHeadPayload {
  return head => renderSSRHead(head, options)
}

/**
 * Compiles static head input once and returns compiled tags when it can, otherwise the
 * original input. Without a key, call it at process scope: the input object is
 * the cache key, and it must not change afterwards.
 *
 * With a key, the input may be built per request, for example a route's links. The
 * key must decide the input exactly: a hit returns the compiled tags of the first input
 * with that key and never reads the new one. Once the cache holds
 * `MAX_PREPARED_KEYS` keys, a new key returns its input.
 *
 * @experimental
 */
export function prepareHeadInput<T extends object>(input: T, key?: string): T | CompiledTags {
  if (Array.isArray(input))
    return input
  const cache: Map<unknown, CompiledTags | 0> = key === undefined
    ? (prepared ||= new WeakMap()) as unknown as Map<unknown, CompiledTags | 0>
    : preparedByKey ||= new Map()
  const lookup = key ?? input
  let compiledTags = cache.get(lookup)
  if (compiledTags === undefined) {
    // a WeakMap has no size, so only the keyed cache stops growing
    if (cache.size >= MAX_PREPARED_KEYS)
      return input
    const compiled = compileTags(input)
    compiledTags = compiled._tag === 'Ok' ? compiled.tags : 0
    cache.set(lookup, compiledTags)
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
  head._tp = head._tpActive = undefined
  if (!options.disableDefaults)
    head.push(DEFAULT_COMPILED_TAGS)
  options.init?.forEach(input => input && head.push(input))
  options.plugins?.forEach(head.use)
  return head as unknown as CompiledServerUnhead<T>
}
