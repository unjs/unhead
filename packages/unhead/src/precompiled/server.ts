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

/** Resolve build-finalized plans using only runtime execution order. @experimental */
export function resolveTags(head: PrecompiledServerHead): PrecompiledTag[] {
  const tags: PrecompiledTag[] = []
  for (const plan of head._p) {
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

/** Render a sealed static SSR head. @experimental */
export function renderSSRHead(head: PrecompiledServerHead): SSRHeadPayload {
  const output = ['', '', '', '', '']
  for (const tag of resolveTags(head)) {
    const position = tag[3] || 0
    const html = tag[2]
    if (html)
      output[position] += html
  }
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
