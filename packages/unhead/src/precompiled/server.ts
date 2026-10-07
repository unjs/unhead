import type { ResolvableHead, SSRHeadPayload, UseSeoMetaInput } from 'unhead/types'
import { DEFAULT_STATIC_PLAN } from '../server/defaults'

/** @internal */
export type PrecompiledTag = readonly [
  weight: number,
  identity: string,
  html: string,
  position?: 0 | 1 | 2 | 3 | 4,
]

/** @internal */
export type PrecompiledHeadInput = readonly PrecompiledTag[]

export interface PrecompiledHeadOptions {
  disableDefaults?: boolean
}

export interface PrecompiledServerHead {
  /** @internal */
  _p: PrecompiledHeadInput[]
}

// Plans are immutable module-level consts in compiled output, so resolved tags
// and rendered payload strings are memoized per plan (and per plan pair, for
// the defaults + plan shape the emit produces). Heads are per-request; plans
// are shared across requests. Hand-written plans that mutate their array after
// the first render would read a stale cache; the sealed runtime contract makes
// plans build-finalized.
// @internal
const planTagsCache = new WeakMap<PrecompiledHeadInput, readonly PrecompiledTag[]>()
// @internal
const planPayloadCache = new WeakMap<PrecompiledHeadInput, PayloadStrings>()
// @internal
const pairPayloadCache = new WeakMap<PrecompiledHeadInput, WeakMap<PrecompiledHeadInput, PayloadStrings>>()

/** @internal */
type PayloadStrings = readonly [string, string, string, string, string]

/**
 * Create a sealed static SSR head.
 *
 * This compile-or-error runtime intentionally excludes dynamic input, hooks,
 * plugins, entry handles, custom weights, framework adapters and streaming.
 *
 * @experimental
 */
export function createHead(options: PrecompiledHeadOptions = {}): PrecompiledServerHead {
  return {
    _p: options.disableDefaults ? [] : [DEFAULT_STATIC_PLAN],
  }
}

function resolvePlans(plans: PrecompiledHeadInput[]): PrecompiledTag[] {
  const tags: PrecompiledTag[] = []
  for (const plan of plans) {
    for (const tag of plan)
      tags.push(tag)
  }
  tags.sort((a, b) => a[0] - b[0])

  const resolved = new Map<string, PrecompiledTag>()
  for (const tag of tags) {
    const previous = resolved.get(tag[1])
    // Sorted priorities mean the first tag wins across different weights;
    // stable execution order means the last tag wins at the same weight.
    // Attribute tags use merge semantics in the normal runtime: after sorting,
    // the later value wins regardless of priority. Other identities retain the
    // highest priority, with later execution winning ties.
    if (!previous || tag[3] === 3 || tag[3] === 4 || previous[0] === tag[0])
      resolved.set(tag[1], tag)
  }
  return [...resolved.values()]
}

/** Resolve build-finalized plans using only runtime execution order. @experimental */
export function resolveTags(head: PrecompiledServerHead): PrecompiledTag[] {
  // fresh array per call: callers may mutate the result; the cached array is shared
  if (head._p.length === 1) {
    const plan = head._p[0]
    let tags = planTagsCache.get(plan)
    if (!tags) {
      tags = resolvePlans([plan])
      planTagsCache.set(plan, tags)
    }
    return tags.slice()
  }
  return resolvePlans(head._p)
}

/** @internal */
function payloadTags(head: PrecompiledServerHead): readonly PrecompiledTag[] {
  if (head._p.length === 1) {
    const plan = head._p[0]
    let tags = planTagsCache.get(plan)
    if (!tags) {
      tags = resolvePlans([plan])
      planTagsCache.set(plan, tags)
    }
    return tags
  }
  return resolvePlans(head._p)
}

/** @internal */
function payloadStrings(head: PrecompiledServerHead): PayloadStrings {
  // single plan: the compiled norm with disableDefaults
  if (head._p.length === 1) {
    const plan = head._p[0]
    let strings = planPayloadCache.get(plan)
    if (!strings) {
      strings = renderStrings(payloadTags(head))
      planPayloadCache.set(plan, strings)
    }
    return strings
  }
  // defaults + one plan: the compiled norm with defaults enabled
  if (head._p.length === 2) {
    const [first, second] = head._p
    let inner = pairPayloadCache.get(first)
    let strings = inner?.get(second)
    if (!strings) {
      strings = renderStrings(payloadTags(head))
      if (!inner) {
        inner = new WeakMap()
        pairPayloadCache.set(first, inner)
      }
      inner.set(second, strings)
    }
    return strings
  }
  return renderStrings(payloadTags(head))
}

/** @internal */
function renderStrings(tags: readonly PrecompiledTag[]): PayloadStrings {
  const output: [string, string, string, string, string] = ['', '', '', '', '']
  for (const tag of tags) {
    const position = tag[3] || 0
    const html = tag[2]
    if (html)
      output[position] += html
  }
  return output
}

/** Render a sealed static SSR head. @experimental */
export function renderSSRHead(head: PrecompiledServerHead): SSRHeadPayload {
  const output = payloadStrings(head)
  return {
    headTags: output[0],
    bodyTags: output[2],
    bodyTagsOpen: output[1],
    htmlAttrs: output[3],
    bodyAttrs: output[4],
  }
}

/** Create a renderer for a sealed static SSR head. @experimental */
export function createServerRenderer() {
  return (head: PrecompiledServerHead): SSRHeadPayload => renderSSRHead(head)
}

/** SSR composable for build-finalized plans. @experimental */
export function useHead(input: ResolvableHead, options: { head: PrecompiledServerHead }): void {
  options.head._p.push(input as unknown as PrecompiledHeadInput)
}

/** Static SEO input is lowered to the same plan format by the bundler. @experimental */
export function useSeoMeta(input: UseSeoMetaInput, options: { head: PrecompiledServerHead }): void {
  options.head._p.push(input as unknown as PrecompiledHeadInput)
}
