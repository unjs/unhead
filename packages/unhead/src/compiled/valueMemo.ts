import type { SSRHeadPayload } from '../types'
import type { CompiledEntry, CompiledRenderer, CompiledTagsHead, Memo, RuntimeTag } from './core'
import type { CompiledTag } from './types'
import { escapeHtml } from '../server/util/tagToString'
import { renderTags } from './core'
import { copyValue, DYNAMIC_VALUE_CLOSE, DYNAMIC_VALUE_OPEN, DYNAMIC_VALUE_RE } from './tags'

type EntryValues = (readonly unknown[] | undefined)[]

const DOUBLE_QUOTE_RE = /"/g
const LT_RE = /</g
const JSON_TYPE_RE = /json$|^importmap$|^speculationrules$/
const TOKEN_MARKED_RE = /\uE000(\d+)\.(\d+)\.(\d)\uE001/
const TOKEN_ENTRY_RE = /\uE000(\d+)\.(\d+)\uE001/g
// a static prefix of a closing tag or a template param next to a dynamic value
const RAW_NEIGHBOUR_RE = /<\/?[a-z]*\uE000/i
const PARAM_NEIGHBOUR_RE = /%[\w.]*\uE000/
const PARAM_UNSAFE_RE = /%|^\s|\s$/

const MODE_ATTR = 0
const MODE_TITLE = 1
const MODE_RAW = 2
const MODE_JSON = 3

function markMode(value: string, mode: number): string {
  return value.replace(TOKEN_ENTRY_RE, `${DYNAMIC_VALUE_OPEN}$1.$2.${mode}${DYNAMIC_VALUE_CLOSE}`)
}

/**
 * Runs the sequence of compiled tags through the v3 rules with tokens for its values, then
 * stores the result as text pieces. A token holds its entry position, its value
 * index, and how the place it landed in escapes.
 */
export function buildValueMemo(head: CompiledTagsHead, omitLineBreaks: boolean | undefined, renderer: CompiledRenderer, revive: (compiledTag: CompiledTag, p: number, resolve: (value: string) => string) => RuntimeTag): Memo {
  const tags: RuntimeTag[] = []
  const tp = !!head._tp
  let unsafe = false
  let index = 0
  for (const entry of head.entries.values() as Iterable<CompiledEntry>) {
    const position = index++
    entry._compiled!.forEach((compiledTag, i) => {
      tags.push(revive(compiledTag, (entry._i << 10) + i, (value) => {
        unsafe ||= tp && PARAM_NEIGHBOUR_RE.test(value)
        return value.replace(DYNAMIC_VALUE_RE, `${DYNAMIC_VALUE_OPEN}${position}.$1${DYNAMIC_VALUE_CLOSE}`)
      }))
    })
  }
  const previousTemplate = head._titleTemplate
  head._titleTemplate = undefined
  const html = renderTags(renderer.r(tags, head), omitLineBreaks, renderer, (tag) => {
    for (const key in tag.props) {
      const value = tag.props[key]
      if (typeof value === 'string' && value.includes(DYNAMIC_VALUE_OPEN))
        tag.props[key] = markMode(value, MODE_ATTR)
    }
    for (const key of ['textContent', 'innerHTML']) {
      if (tag[key]?.includes?.(DYNAMIC_VALUE_OPEN)) {
        // a param expansion escapes JSON values, which a raw value would not
        unsafe ||= !!tag.processTemplateParams
        tag[key] = markMode(tag[key], tag.tag === 'title' ? MODE_TITLE : tag.tag === 'script' && JSON_TYPE_RE.test(String(tag.props.type)) ? MODE_JSON : MODE_RAW)
      }
    }
  })
  let dynamic = false
  const buckets: Memo['b'] = html as any
  for (const key in html) {
    const bucket: string = (html as any)[key]
    if (bucket.includes(DYNAMIC_VALUE_OPEN)) {
      dynamic = true
      unsafe ||= RAW_NEIGHBOUR_RE.test(bucket) || (tp && PARAM_NEIGHBOUR_RE.test(bucket))
      buckets[key] = bucket.split(TOKEN_MARKED_RE).map((piece, i) => i % 4 ? +piece : piece)
    }
  }
  const state: Memo['s'] = { _title: head._title }
  if (head._titleTemplate === undefined)
    head._titleTemplate = previousTemplate
  else
    state._titleTemplate = head._titleTemplate
  if (tp) {
    state._templateParams = head._templateParams
    state._separator = head._separator
  }
  return { b: buckets, x: unsafe, d: dynamic, s: state }
}

// Returns undefined when the value could change a v3 decision. Escaping matches
// v3: `escapeHtml` for title text, `encodeAttribute` for attributes, a `\u003C`
// escape for each `<` of JSON script text, and other raw text holds no `<`, so no closing
// tag rule applies. Template params never reach script text, because the build
// sends a tag that opts in to the slow path. So a large payload costs one
// `includes` scan, and a regex only when it holds a `<`.
function escapeValue(entryValue: unknown, mode: number, tp: boolean): string | undefined {
  if (typeof entryValue === 'number' && entryValue && Number.isFinite(entryValue))
    return String(entryValue)
  if (typeof entryValue !== 'string' || !entryValue || entryValue === 'true')
    return
  if (mode >= MODE_RAW)
    return !entryValue.includes('<') ? entryValue : mode === MODE_JSON ? entryValue.replace(LT_RE, '\\u003C') : undefined
  if (tp && PARAM_UNSAFE_RE.test(entryValue))
    return
  return mode === MODE_ATTR
    ? entryValue.includes('"') ? entryValue.replace(DOUBLE_QUOTE_RE, '&quot;') : entryValue
    : entryValue.includes('$') ? undefined : escapeHtml(entryValue)
}

/**
 * Restores the head fields of a memo and joins its pieces with escaped values.
 */
export function renderValueMemo(memo: Memo, head: CompiledTagsHead): SSRHeadPayload | undefined {
  const state = memo.s!
  const tp = !!state._templateParams
  const html: Record<string, unknown> = { ...memo.b }
  const values: EntryValues = []
  let safe = true
  for (const entry of head.entries.values() as Iterable<CompiledEntry>)
    values.push(entry._values)
  // A title value sets the title state even when a title template hides it from the
  // HTML, so it passes the title checks either way. A value that is the whole title
  // keeps its type, as in v3.
  const resolveState = (value: any): any => {
    let whole: unknown
    const out = value?.includes?.(DYNAMIC_VALUE_OPEN) && value.replace(TOKEN_ENTRY_RE, (token: string, entry: string, index: string) => {
      const entryValue = values[+entry]?.[+index]
      safe &&= escapeValue(entryValue, MODE_TITLE, tp) !== undefined
      if (token === value)
        whole = entryValue
      return entryValue
    })
    return out ? whole ?? out : value
  }
  for (const key in html) {
    const bucket = html[key]
    if (typeof bucket !== 'string') {
      const pieces = bucket as (string | number)[]
      let out = pieces[0] as string
      for (let i = 1; i < pieces.length; i += 4) {
        const text = escapeValue(values[pieces[i] as number]?.[pieces[i + 1] as number], pieces[i + 2] as number, tp)
        if (text === undefined)
          return
        out += text + (pieces[i + 3] as string)
      }
      html[key] = out
    }
  }
  const title = resolveState(state._title)
  const params = copyValue(state._templateParams)
  if (params)
    params.pageTitle = resolveState(params.pageTitle)
  if (!safe)
    return
  Object.assign(head, state)
  head._title = title
  if (params)
    head._templateParams = params
  return html as unknown as SSRHeadPayload
}
