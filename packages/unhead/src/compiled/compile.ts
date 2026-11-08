import type { HeadTag } from '../types'
import type { CompiledTag, CompiledTagExtra, CompiledTags, CompiledTagValue } from './types'
import { capoTagWeight } from '../server/sort'
import { INVALID_ATTR_NAME_RE } from '../utils/attrs'
import { hasContent, ValidHeadTags } from '../utils/const'
import { dedupeKey, hashTag, isMetaArrayDupeKey } from '../utils/dedupe'
import { normalizeEntryToTags } from '../utils/normalize'
import { ALIAS_PRIORITY_RE, copyValue, DYNAMIC_VALUE_CLOSE, DYNAMIC_VALUE_OPEN, DYNAMIC_VALUE_RE, dynamicValue, FLAG_ARRAYABLE, FLAG_DYNAMIC_VALUES, FLAG_IDENTITY, resolveDynamicValues, toHeadInput } from './tags'

export { dynamicValue, toHeadInput } from './tags'
export type { CompiledEntryContent, CompiledTag, CompiledTagExtra, CompiledTagProps, CompiledTags, CompiledTagValue } from './types'

/**
 * @experimental
 */
export type CompileResult
  = | { _tag: 'Ok', tags: CompiledTags, valueCount: number }
    | { _tag: 'Bail', reason: string }

/**
 * @experimental
 */
export interface CompileOptions {
  /**
   * Number of dynamic values. Each `dynamicValue(index)` token below this count marks one.
   * Any other private-use token in the input bails.
   */
  dynamicValues?: number
}

const MAX_DEPTH = 32
// `_p` packs the tag index into 10 bits
const MAX_ENTRY_TAGS = 1024

const CONFIG_KEYS = ['textContent', 'innerHTML', 'tagPosition', 'tagPriority', 'key', 'processTemplateParams', 'tagDuplicateStrategy'] as const
const CONTENT_KEYS = /* @__PURE__ */ new Set<string>(['textContent', 'innerHTML'])

// A value may never change identity, weight, or a merge decision
const DYNAMIC_VALUE_BANNED_ANYWHERE = /* @__PURE__ */ new Set(['key', 'id', 'tagPriority', 'tagPosition', 'tagDuplicateStrategy', 'processTemplateParams', 'class', 'style'])
const DYNAMIC_VALUE_BANNED: Record<string, Set<string>> = {
  meta: /* @__PURE__ */ new Set(['name', 'property', 'http-equiv', 'charset']),
  link: /* @__PURE__ */ new Set(['rel', 'hreflang', 'as', 'type']),
  script: /* @__PURE__ */ new Set(['type', 'src', 'async', 'defer']),
}
// templateParams values reach many tags, and titleTemplate decides the whole title. Style
// content decides its weight through `@import`, so a runtime sends a value with `@import` to v3.
const DYNAMIC_VALUE_BANNED_TAGS = /* @__PURE__ */ new Set(['templateParams', 'titleTemplate', 'style'])

// The fast tiers never run the hooks of the built-in plugins on compiled tags, so compiled tags hold
// nothing they change: the props `DeprecationsPlugin` rewrites, and the priority
// aliases `AliasSortingPlugin` moves. Promises are not plain JSON, and `_flatMeta` is
// not a head tag.
const PLUGIN_PROPS = ['children', 'hid', 'vmid', 'body', 'renderPriority']

const WHOLE_DYNAMIC_VALUE_RE = /^\uE000\d+\uE001$/
const COERCIBLE_TEXT_RE = /^[true]*$/

// Values that a dynamic value can hold at runtime. Compiled tags must rebuild the input v3 would see for each.
const VALUE_PROBES: unknown[] = [null, undefined, '', 'true', 'x', 0, false, ['a', 'b'], { a: 1 }]

function bail(reason: string): CompileResult {
  return { _tag: 'Bail', reason }
}

function hasDynamicValue(value: unknown): boolean {
  return typeof value === 'string' && value.includes(DYNAMIC_VALUE_OPEN)
}

function hasStrayToken(value: string, dynamicValues: number): boolean {
  const rest = value.replace(DYNAMIC_VALUE_RE, (match, index) => +index < dynamicValues ? '' : match)
  return rest.includes(DYNAMIC_VALUE_OPEN) || rest.includes(DYNAMIC_VALUE_CLOSE)
}

function findUnprovable(value: unknown, dynamicValues: number, depth: number): string | undefined {
  if (value === undefined || value === null || typeof value === 'boolean')
    return
  if (typeof value === 'string')
    return hasStrayToken(value, dynamicValues) ? 'private-use token in a string value' : undefined
  if (typeof value === 'number')
    return Number.isFinite(value) ? undefined : 'non-finite number'
  if (typeof value !== 'object')
    return `${typeof value} value`
  if (depth > MAX_DEPTH)
    return 'input is nested too deeply'
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype)
    return 'value is not plain JSON'
  for (const key of Object.keys(value)) {
    if (hasStrayToken(key, 0))
      return 'private-use token in a key'
    const reason = findUnprovable((value as Record<string, unknown>)[key], dynamicValues, depth + 1)
    if (reason)
      return reason
  }
}

// `sanitizeTags` would drop this tag and it has no identity, so it cannot shadow another tag.
// A dropped tag with an identity stays in the compiled tags: v3 dedupes before it sanitizes,
// so `{ title: '' }` still removes an earlier title.
function isInert(tag: HeadTag): boolean {
  const { props, innerHTML, textContent } = tag
  return !dedupeKey(tag) && (
    (!Object.keys(props).length && !hasContent(innerHTML) && !hasContent(textContent))
    || (tag.tag === 'meta' && !hasContent(props.content) && !props['http-equiv'] && !props.charset)
  )
}

function serializeTagValue(value: unknown): unknown {
  return value instanceof Set ? ['Set', ...value] : value instanceof Map ? ['Map', ...value] : value
}

function fingerprint(tags: HeadTag[]): string {
  return JSON.stringify(tags.filter(tag => !isInert(tag)).map(tag => [
    tag.tag,
    Object.entries(tag.props).map(([key, value]) => [key, serializeTagValue(value)]),
    CONFIG_KEYS.map(key => tag[key] === undefined ? '_' : tag[key]),
    tag._h,
  ]))
}

function applyValues(value: unknown, values: readonly unknown[]): unknown {
  if (typeof value === 'string')
    return hasDynamicValue(value) ? resolveDynamicValues(value, values) : value
  if (Array.isArray(value))
    return value.map(item => applyValues(item, values))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value))
      out[key] = applyValues((value as Record<string, unknown>)[key], values)
    return out
  }
  return value
}

function findDynamicValueReason(tag: HeadTag, identity: string): string | undefined {
  if (identity.includes(DYNAMIC_VALUE_OPEN))
    return `dynamic value in the identity of a ${tag.tag} tag`
  for (const key in tag.props) {
    const value = tag.props[key]
    if (hasDynamicValue(value)) {
      if (DYNAMIC_VALUE_BANNED_TAGS.has(tag.tag) || DYNAMIC_VALUE_BANNED_ANYWHERE.has(key) || DYNAMIC_VALUE_BANNED[tag.tag]?.has(key))
        return `dynamic value in ${tag.tag} ${key}`
      // the whole value could come out as `true` or empty, which v3 turns into a boolean attribute
      if (!WHOLE_DYNAMIC_VALUE_RE.test(value) && COERCIBLE_TEXT_RE.test(value.replace(DYNAMIC_VALUE_RE, '')))
        return `dynamic value in ${tag.tag} ${key} could form a boolean`
    }
  }
  for (const key of CONFIG_KEYS) {
    if (hasDynamicValue(tag[key]) && (!CONTENT_KEYS.has(key) || (tag.tag !== 'style' && DYNAMIC_VALUE_BANNED_TAGS.has(tag.tag))))
      return `dynamic value in ${tag.tag} ${key}`
  }
}

function compileTag(tag: HeadTag, identity: string): CompiledTag | string {
  // v3 only applies `%s` to a string, and the strict head has no such branch
  if (tag.tag === 'titleTemplate' && tag.textContent && typeof tag.textContent !== 'string')
    return 'titleTemplate is not a string'
  const props: Record<string, CompiledTagValue | object> = {}
  let dynamicValues = false
  for (const key in tag.props) {
    const value: unknown = tag.props[key]
    if (tag.tag === 'templateParams') {
      // v3 merges these two names as a Set and a Map, whatever the tag
      if (key === 'class' || key === 'style')
        return `${key} template param`
      // the input may change after the call, for example a keyed `prepareHeadInput` input
      props[key] = copyValue(value) as CompiledTagValue
    }
    else if (key.startsWith('on')) {
      return `${key} handler`
    }
    // normalize only filters names on element tags, and compiled tags are not filtered again
    else if (!key || INVALID_ATTR_NAME_RE.test(key)) {
      return `invalid attribute name ${key}`
    }
    else if (value instanceof Set) {
      props[key] = [...value].join(' ')
    }
    else if (value instanceof Map) {
      props[key] = [...value].map(([k, v]) => `${k}:${v}`).join(';')
    }
    // v3 throws while it renders a null class or style
    else if ((key === 'class' || key === 'style') || (typeof value === 'object' && value !== null)) {
      return `${key} is not a compiled tag value`
    }
    else {
      props[key] = value as CompiledTagValue
      dynamicValues ||= hasDynamicValue(value)
    }
  }
  const extra: Record<string, CompiledTagValue> = {}
  let hasExtra = false
  for (const key of CONFIG_KEYS) {
    const value: unknown = tag[key]
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null)
        return `${key} is not a compiled tag value`
      extra[key] = value as CompiledTagValue
      hasExtra = true
      dynamicValues ||= hasDynamicValue(value)
    }
  }
  const flags = (tag._d ? FLAG_IDENTITY : 0)
    | (tag.tag === 'meta' && isMetaArrayDupeKey(identity) ? FLAG_ARRAYABLE : 0)
    | (dynamicValues ? FLAG_DYNAMIC_VALUES : 0)
  const compiledTag: CompiledTag = [tag.tag, Object.keys(props).length ? props : 0, capoTagWeight(tag), identity]
  return flags || hasExtra ? [...compiledTag, hasExtra ? extra as CompiledTagExtra : 0, flags] as unknown as CompiledTag : compiledTag
}

function compile(input: unknown, dynamicValues: number): CompileResult {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return bail('input is not an object')
  const reason = findUnprovable(input, dynamicValues, 0)
  if (reason)
    return bail(reason)
  const tags = normalizeEntryToTags(input, [])
  const compiledTags: CompiledTag[] = []
  for (const tag of tags) {
    if (!ValidHeadTags.has(tag.tag) && tag.tag !== 'titleTemplate' && tag.tag !== 'templateParams')
      return bail(`unknown tag ${tag.tag}`)
    tag._d = dedupeKey(tag)
    const identity = tag._d || hashTag(tag)
    const dynamicValueReason = findDynamicValueReason(tag, identity)
    if (dynamicValueReason)
      return bail(dynamicValueReason)
    // before the inert check: a key from `hid` would give a dropped tag an identity
    const pluginProp = PLUGIN_PROPS.find(key => key in tag.props)
    if (pluginProp)
      return bail(`${pluginProp} prop`)
    if (ALIAS_PRIORITY_RE.test(tag.tagPriority as string))
      return bail('tagPriority alias')
    if (isInert(tag))
      continue
    const compiled = compileTag(tag, identity)
    if (typeof compiled === 'string')
      return bail(compiled)
    compiledTags.push(compiled)
  }
  if (compiledTags.length >= MAX_ENTRY_TAGS)
    return bail('too many tags in one entry')
  if (fingerprint(normalizeEntryToTags(toHeadInput(compiledTags, Array.from({ length: dynamicValues }, (_, i) => dynamicValue(i))), [])) !== fingerprint(tags))
    return bail('compiled tags do not rebuild the input')
  if (dynamicValues) {
    for (const probe of VALUE_PROBES) {
      const values = Array.from({ length: dynamicValues }).fill(probe)
      if (fingerprint(normalizeEntryToTags(toHeadInput(compiledTags, values), [])) !== fingerprint(normalizeEntryToTags(applyValues(input, values), [])))
        return bail('a value would change how the input normalizes')
    }
  }
  return { _tag: 'Ok', tags: compiledTags, valueCount: dynamicValues }
}

/**
 * Compiles static head input to compiled tags at build time. It uses the v3 normalize,
 * dedupe, and weight rules, keeps no state, and never throws: input it cannot
 * prove returns `Bail`, and the call stays loose.
 *
 * @experimental
 */
export function compileTags(input: unknown, options: CompileOptions = {}): CompileResult {
  try {
    return compile(input, options.dynamicValues || 0)
  }
  catch (error) {
    return bail(`input could not be normalized: ${(error as Error).message}`)
  }
}
