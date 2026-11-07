import type { CreateServerHeadOptions, RenderSSRHeadOptions, SSRHeadPayload, Unhead } from '../types'
import type { CompiledEntry, CompiledRenderer, CompiledTagsHead, RuntimeTag } from './core'
import type { CompiledTags } from './types'
import { escapeHtml } from '../server/util/tagToString'
import { buildStaticMemo, DEFAULT_COMPILED_TAGS, isEmpty, renderCompiledHead, reviveTag } from './core'
import { DYNAMIC_VALUE_RE } from './tags'
import { applyTemplateParams } from './templateParams'

export type { CreateServerHeadOptions, SSRHeadPayload } from '../types'
export type { CompiledTag, CompiledTagExtra, CompiledTagProps, CompiledTags, CompiledTagValue } from './types'

type TemplateParamsRules = (tags: RuntimeTag[], tagMap: Map<string, any>, head: CompiledTagsHead) => void

type StrictHead = CompiledTagsHead & { _tp?: TemplateParamsRules }

/**
 * @experimental
 */
export interface StrictHeadOptions extends Omit<CreateServerHeadOptions, 'init' | 'plugins' | 'propResolvers' | 'hooks' | 'tagWeight'> {
  init?: (CompiledTags | undefined | false)[]
  plugins?: (typeof templateParams)[]
  /** A strict head refuses these at runtime, so the types say so too. */
  propResolvers?: never
  hooks?: never
  tagWeight?: never
}

const DOUBLE_QUOTE_RE = /"/g
const LT_RE = /</g
const JSON_TYPE_RE = /json$|^importmap$|^speculationrules$/
const ENTRY_OPTION_RE = /^(?:head|onRendered|_index|values)$/

/**
 * The native template params plugin of a strict head, for
 * `createHead({ plugins: [templateParams] })`. A strict head has no hooks to run
 * `TemplateParamsPlugin`, and importing this only when used keeps it out of a
 * bundle that has no params.
 *
 * @experimental
 */
export const templateParams = { key: 'template-params', _tp: applyTemplateParams as TemplateParamsRules }

function unsupported(feature: string): never {
  throw new Error(`[unhead] A strict head renders compiled tags only. For ${feature}, use unhead/compiled/server.`)
}

// v3 `hasContent`. A compiled tag value is finite, and a value must be a string or finite number
function hasContent(value: unknown): unknown {
  return value === 0 || value
}

// compile refuses invalid attribute names and non-scalar values, and the props of
// a compiled tag hold class and style as strings, so this is `propsToString` for compiled tags
function compiledPropsToString(props: Record<string, any>): string {
  let attrs = ''
  for (const key in props) {
    const value = props[key]
    if (value !== false && value !== null)
      attrs += value === true ? ` ${key}` : ` ${key}="${String(value).replace(DOUBLE_QUOTE_RE, '&quot;')}"`
  }
  return attrs
}

// the v3 sanitize and `tagToString` rules for the tag names compiled tags can hold
function compiledTagToString(tag: RuntimeTag): string {
  const { tag: name, props, innerHTML, textContent } = tag
  if (name === 'titleTemplate' || name === 'templateParams'
    || (isEmpty(props) && !hasContent(innerHTML) && !hasContent(textContent))
    || (name === 'meta' && !hasContent(props.content) && !props['http-equiv'] && !props.charset)) {
    return ''
  }
  const open = `<${name}${compiledPropsToString(props)}>`
  if (name === 'meta' || name === 'link' || name === 'base')
    return open
  const content = String(textContent ?? innerHTML ?? '')
  return `${open}${name === 'title'
    ? escapeHtml(content)
    : name === 'script' && JSON_TYPE_RE.test(props.type)
      ? content.replace(LT_RE, '\\u003C')
      : content.replace(new RegExp(`</${name}`, 'gi'), `<\\/${name}`)}</${name}>`
}

function styleEntries(value: string): [string, string][] {
  return value.split(';').filter(Boolean).map((part) => {
    const i = part.indexOf(':')
    return [part.slice(0, i), part.slice(i + 1)]
  })
}

// `dedupeTags` and `resolveTitleTemplate` over compiled tag values: class and style are
// strings, and the arrayable flag replaces the meta table
function resolveCompiledTags(tags: RuntimeTag[], head: StrictHead): RuntimeTag[] {
  const sort = (a: RuntimeTag, b: RuntimeTag) => a._w === b._w ? a._p - b._p : a._w - b._w
  const tagMap = new Map<string, any>()
  let hasFlatMeta = false
  for (const next of tags.sort(sort)) {
    const key = next._d
    const prev = tagMap.get(key)
    if (!prev) {
      tagMap.set(key, next)
    }
    else if ((next.tagDuplicateStrategy || (next.tag === 'htmlAttrs' || next.tag === 'bodyAttrs' || next.tag === 'templateParams' || (next.key && next.key === prev.key) ? 'merge' : 0)) === 'merge') {
      const props: Record<string, any> = { ...prev.props }
      for (const p in next.props) {
        const value = next.props[p]
        props[p] = p === 'style'
          ? [...new Map([...styleEntries(prev.props.style || ''), ...styleEntries(value)])].map(([k, v]) => `${k}:${v}`).join(';')
          : p === 'class'
            ? [...new Set(`${prev.props.class || ''} ${value}`.split(' ').filter(Boolean))].join(' ')
            : value
      }
      tagMap.set(key, { ...next, props })
    }
    else if (next._m && (next._p >> 10) === (prev._p >> 10)) {
      tagMap.set(key, Object.assign([prev, next].flat(), next))
      hasFlatMeta = true
    }
    else if (next._w === prev._w ? next._p > prev._p : next._w < prev._w) {
      tagMap.set(key, next)
    }
  }
  const title = tagMap.get('title')
  const tpl = tagMap.get('titleTemplate')
  head._title = title?.textContent
  if (tpl) {
    const fn = tpl.textContent
    if (fn) {
      const value = head._tp ? fn : fn.replace('%s', title?.textContent || '')
      if (title)
        tagMap.set('title', { ...title, textContent: value })
      else
        tagMap.set('titleTemplate', { ...tpl, tag: 'title', textContent: value })
    }
  }
  tags = [...tagMap.values()].flat()
  if (hasFlatMeta)
    tags.sort(sort)
  head._tp?.(tags, tagMap, head)
  return tags
}

// the `normalizeProps` value rule for a value. A strict head has no loose path, so
// v3 rules cannot decide a value that is not a string or number
function resolveDynamicValue(value: string, values: readonly unknown[] | undefined, key: string | 0, tag: string): unknown {
  let whole: unknown
  const replaced = value.replace(DYNAMIC_VALUE_RE, (match, index) => {
    const entryValue = values?.[+index]
    if (typeof entryValue !== 'string' && !Number.isFinite(entryValue))
      unsupported('non-text values')
    if (match.length === value.length)
      whole = entryValue
    return String(entryValue)
  })
  const out = whole ?? replaced
  return key && (out === 'true' || out === '') && !key.startsWith('data-') && !(tag === 'meta' && key === 'content') ? true : out
}

const renderer: CompiledRenderer = {
  n: { m: [] },
  t: compiledTagToString,
  a: compiledPropsToString,
  r: resolveCompiledTags as CompiledRenderer['r'],
  b: buildStaticMemo,
  c(head) {
    const tags: RuntimeTag[] = []
    for (const entry of head.entries.values() as Iterable<CompiledEntry>) {
      entry._compiled!.forEach((compiledTag, i) => {
        tags.push(reviveTag(compiledTag, (entry._i << 10) + i, (value, key, tag) => resolveDynamicValue(value, entry._values, key, tag)))
      })
    }
    return tags
  },
}

/**
 * Renders a strict head.
 *
 * @experimental
 */
export function renderSSRHead(head: Unhead<any>, options?: Pick<RenderSSRHeadOptions, 'omitLineBreaks'>): SSRHeadPayload {
  return renderCompiledHead(head as CompiledTagsHead, options?.omitLineBreaks, renderer)
}

/**
 * @experimental
 */
export function createServerRenderer(options?: Pick<RenderSSRHeadOptions, 'omitLineBreaks'>): (head: Unhead<any>) => SSRHeadPayload {
  return head => renderSSRHead(head, options)
}

/**
 * Creates a server head that renders compiled tags only. It holds no loose path, no hook
 * system, and no full runtime, and it throws on anything else.
 *
 * @experimental
 */
/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: StrictHeadOptions = {}): Unhead<CompiledTags, SSRHeadPayload> {
  if (options.hooks || options.tagWeight || (options.propResolvers as unknown[] | undefined)?.length)
    unsupported('hooks, tagWeight, or propResolvers')
  const entries = new Map<number, CompiledEntry>()
  const check = (input: unknown, entryOptions?: Record<string, unknown>) => {
    if (!Array.isArray(input))
      unsupported('loose input')
    for (const key in entryOptions) {
      if (!ENTRY_OPTION_RE.test(key))
        unsupported('entry options')
    }
  }
  const head = {
    _entryCount: 1,
    plugins: new Map(),
    resolvedOptions: options,
    ssr: true,
    entries,
    get hooks(): any {
      return unsupported('hooks')
    },
    render: () => renderSSRHead(head, options),
    use(plugin: any) {
      if (!plugin._tp)
        unsupported('plugins other than the templateParams export')
      head._tp = plugin._tp
    },
    push(input: CompiledTags, entryOptions?: any) {
      check(input, entryOptions)
      const _i: number = entryOptions?._index ?? head._entryCount++
      const entry: CompiledEntry = { _i, input, options: {}, _compiled: input, _values: entryOptions?.values }
      entries.set(_i, entry)
      return {
        _i,
        dispose() {
          entries.delete(_i)
        },
        patch: (next: CompiledTags, patchOptions?: any) => head.push(next, { ...patchOptions, _index: _i }),
      }
    },
  } as unknown as Unhead<CompiledTags, SSRHeadPayload> & StrictHead
  if (!options.disableDefaults)
    head.push(DEFAULT_COMPILED_TAGS)
  options.init?.forEach(input => input && head.push(input))
  options.plugins?.forEach(head.use as any)
  return head
}
