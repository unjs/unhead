import type { ResolvableHead, SSRHeadPayload, UseSeoMetaInput } from 'unhead/types'

/** @internal */
export type PrecompiledUniqueTag = readonly [
  weight: number,
  html: string,
  position?: 0 | 1 | 2 | 3 | 4,
]

/** @internal */
export type PrecompiledUniqueHeadInput = readonly PrecompiledUniqueTag[]

/** @internal */
export type PrecompiledUniqueBindings = readonly (() => unknown)[]

/** @internal */
export type PrecompiledUniqueEntry = PrecompiledUniqueHeadInput | readonly [PrecompiledUniqueHeadInput, PrecompiledUniqueBindings]

export interface PrecompiledUniqueServerHead {
  /** @internal */
  _p: PrecompiledUniqueEntry[]
}

/** Compile-only factory replaced with an identity-free head literal. @experimental */
export function createHead(): never {
  throw new Error('[unhead] unique server heads must be compiled by @unhead/bundler')
}

// Plans are immutable module-level consts in compiled output, so rendered
// payload strings are memoized per plan (and per plan pair, for the defaults +
// plan shape the emit produces). Heads are per-request; plans are shared
// across requests. Slotted entries (plan + bindings) skip the payload memo:
// their values are per-request and unbounded.
// @internal
const planPayloadCache = new WeakMap<PrecompiledUniqueHeadInput, PayloadStrings>()
// @internal
const pairPayloadCache = new WeakMap<PrecompiledUniqueHeadInput, WeakMap<PrecompiledUniqueHeadInput, PayloadStrings>>()

/** @internal */
type PayloadStrings = readonly [string, string, string, string, string]

/** @internal */
// eslint-disable-next-line no-control-regex -- NUL-free slot token delimiter
const TOKEN_RE = /\x01([TA])(\d+)\x01/g
const ATTR_ESC_RE = /"/g
const TITLE_ESC_RE = /[&<>"']/g
const TITLE_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }

/** @internal */
function hasBindings(entry: PrecompiledUniqueEntry): entry is readonly [PrecompiledUniqueHeadInput, PrecompiledUniqueBindings] {
  return typeof (entry as readonly [PrecompiledUniqueHeadInput, PrecompiledUniqueBindings])[1]?.[0] === 'function'
}

function planOf(entry: PrecompiledUniqueEntry): PrecompiledUniqueHeadInput {
  return hasBindings(entry) ? entry[0] : entry
}

/** @internal */
function interpolate(html: string, values: unknown[]): string {
  return html.replace(TOKEN_RE, (match, context: string, index: string) => {
    const v = values[+index]
    if (context === 'T') {
      const s = v == null || v === false ? '' : String(v)
      return s.replace(TITLE_ESC_RE, c => TITLE_ESCAPES[c])
    }
    return String(v).replace(ATTR_ESC_RE, '&quot;')
  })
}

/** Resolve identity-free plans whose uniqueness was proven by the build. @experimental */
function resolveTags(head: PrecompiledUniqueServerHead): PrecompiledUniqueTag[] {
  const tags: PrecompiledUniqueTag[] = []
  for (const entry of head._p) {
    for (const tag of planOf(entry))
      tags.push(tag)
  }
  return tags.sort((a, b) => a[0] - b[0])
}

/** @internal */
function renderStrings(tags: readonly PrecompiledUniqueTag[]): PayloadStrings {
  const output: [string, string, string, string, string] = ['', '', '', '', '']
  for (const tag of tags) {
    if (tag[1])
      output[tag[2] || 0] += tag[1]
  }
  return output
}

/** @internal */
function payloadStrings(head: PrecompiledUniqueServerHead): PayloadStrings {
  let slotted = false
  for (const entry of head._p) {
    if (hasBindings(entry))
      slotted = true
  }
  if (!slotted) {
    if (head._p.length === 1) {
      const plan = head._p[0] as PrecompiledUniqueHeadInput
      let strings = planPayloadCache.get(plan)
      if (!strings) {
        strings = renderStrings(resolveTags(head))
        planPayloadCache.set(plan, strings)
      }
      return strings
    }
    if (head._p.length === 2) {
      const [first, second] = head._p as [PrecompiledUniqueHeadInput, PrecompiledUniqueHeadInput]
      let inner = pairPayloadCache.get(first)
      let strings = inner?.get(second)
      if (!strings) {
        strings = renderStrings(resolveTags(head))
        if (!inner) {
          inner = new WeakMap()
          pairPayloadCache.set(first, inner)
        }
        inner.set(second, strings)
      }
      return strings
    }
    return renderStrings(resolveTags(head))
  }
  const output = [...renderStrings(resolveTags(head))] as [string, string, string, string, string]
  for (const entry of head._p) {
    if (!hasBindings(entry))
      continue
    const values = entry[1].map(getter => getter())
    for (let p = 0; p < output.length; p++) {
      if (output[p].includes('\x01'))
        output[p] = interpolate(output[p], values)
    }
  }
  return output
}

/** Render identity-free build-validated plans. @experimental */
export function renderSSRHead(head: PrecompiledUniqueServerHead): SSRHeadPayload {
  const output = payloadStrings(head)
  return {
    headTags: output[0],
    bodyTags: output[2],
    bodyTagsOpen: output[1],
    htmlAttrs: output[3],
    bodyAttrs: output[4],
  }
}

export function createServerRenderer() {
  return (head: PrecompiledUniqueServerHead): SSRHeadPayload => renderSSRHead(head)
}

/** Append one build-validated identity-free plan. @experimental */
export function useHead(input: ResolvableHead, options: { head: PrecompiledUniqueServerHead, bindings?: PrecompiledUniqueBindings }): void {
  options.head._p.push(options.bindings ? [input as unknown as PrecompiledUniqueHeadInput, options.bindings] : input as unknown as PrecompiledUniqueHeadInput)
}

/** Append one build-validated static SEO plan. @experimental */
export const useSeoMeta = useHead as (input: UseSeoMetaInput, options: { head: PrecompiledUniqueServerHead, bindings?: PrecompiledUniqueBindings }) => void
