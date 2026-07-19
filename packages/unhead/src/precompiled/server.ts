import type { ResolvableHead, SSRHeadPayload, UseSeoMetaInput } from 'unhead/types'
import { DEFAULT_STATIC_PLAN } from '../server/defaults'

/** @internal */
export type PrecompiledTag = readonly [
  weight: number,
  identity: string,
  html: string | readonly string[],
  position?: 1 | 2 | 3 | 4,
]

/** @internal */
export type PrecompiledHeadInput = readonly PrecompiledTag[]

export interface PrecompiledHeadOptions {
  disableDefaults?: boolean
  omitLineBreaks?: boolean
}

export interface PrecompiledServerHead {
  /** @internal */
  _p: PrecompiledHeadInput[]
  /** @internal */
  _o: boolean
  push: (input: PrecompiledHeadInput) => void
  render: () => SSRHeadPayload
}

function push(this: PrecompiledServerHead, input: PrecompiledHeadInput): void {
  if (!Array.isArray(input))
    throw new Error('[unhead:pc] The static server runtime received an uncompiled head entry.')
  this._p.push(input)
}

function render(this: PrecompiledServerHead): SSRHeadPayload {
  return renderSSRHead(this)
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
    _o: options.omitLineBreaks === true,
    push,
    render,
  }
}

/** Resolve build-finalized plans using only runtime execution order. @experimental */
export function resolveTags(head: PrecompiledServerHead): PrecompiledTag[] {
  const tags: PrecompiledTag[] = []
  let hasArray = false
  for (const plan of head._p) {
    for (const tag of plan) {
      tags.push(tag)
      hasArray ||= typeof tag[2] !== 'string'
    }
  }
  tags.sort((a, b) => a[0] - b[0])

  // The normal resolver re-sorts final winners by execution position whenever
  // a repeated arrayable group survives dedupe. A lower-weight earlier winner
  // can mask a compiled array, so structural presence alone is not enough.
  const resolved = new Map<string, PrecompiledTag>()
  let hasFlatMeta = false
  if (hasArray) {
    for (const tag of tags) {
      const previous = resolved.get(tag[1])
      if (!previous)
        resolved.set(tag[1], tag)
      if (typeof tag[2] !== 'string' && (!previous || previous[0] === tag[0])) {
        hasFlatMeta = true
        break
      }
    }
    resolved.clear()
  }

  for (const tag of tags) {
    const previous = resolved.get(tag[1])
    // Sorted priorities mean the first tag wins across different weights;
    // stable execution order means the last tag wins at the same weight.
    // Attribute tags use merge semantics in the normal runtime: after sorting,
    // the later value wins regardless of priority. Other identities retain the
    // highest priority, with later execution winning ties.
    // Reinsert same-weight winners in flat-meta mode so Map order tracks the
    // selected execution occurrence, matching the normal resolver's final sort.
    if (hasFlatMeta && previous && previous[0] === tag[0] && tag[3] !== 3 && tag[3] !== 4)
      resolved.delete(tag[1])
    if (!previous || tag[3] === 3 || tag[3] === 4 || previous[0] === tag[0])
      resolved.set(tag[1], tag)
  }
  return [...resolved.values()]
}

/** Render a sealed static SSR head. @experimental */
export function renderSSRHead(head: PrecompiledServerHead, options: { omitLineBreaks?: boolean } = {}): SSRHeadPayload {
  const output = ['', '', '', '', '']
  const lineBreak = (options.omitLineBreaks ?? head._o) ? '' : '\n'
  for (const tag of resolveTags(head)) {
    const position = tag[3] || 0
    const html = tag[2]
    if (typeof html === 'string') {
      if (html)
        output[position] += position < 3 && output[position] ? `${lineBreak}${html}` : html
      continue
    }
    for (const fragment of html) {
      if (fragment)
        output[position] += position < 3 && output[position] ? `${lineBreak}${fragment}` : fragment
    }
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
export function createServerRenderer(options?: { omitLineBreaks?: boolean }) {
  return (head: PrecompiledServerHead): SSRHeadPayload => renderSSRHead(head, options)
}

/** SSR composable for build-finalized plans. @experimental */
export function useHead(input: ResolvableHead, options: { head: PrecompiledServerHead }): void {
  options.head.push(input as unknown as PrecompiledHeadInput)
}

/** Static SEO input is lowered to the same plan format by the bundler. @experimental */
export function useSeoMeta(input: UseSeoMetaInput, options: { head: PrecompiledServerHead }): void {
  options.head.push(input as unknown as PrecompiledHeadInput)
}
