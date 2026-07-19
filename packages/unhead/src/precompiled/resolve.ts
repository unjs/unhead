import type { HeadTag, PropResolver, Unhead } from 'unhead/types'
import type { ResolveTagsOptions } from 'unhead/utils'
import { resolveTagsWithNormalizer } from '../utils/resolve'

function rejectDynamicEntry(_input: any, _propResolvers: PropResolver[]): never {
  throw new Error('[unhead] The precompiled-only runtime received a dynamic head entry.')
}

function clonePrecomputedTag(tag: HeadTag): HeadTag {
  const { _d, _p, _w, ...source } = tag
  if (!source.key)
    delete source._h
  const props: Record<string, any> = { ...source.props }
  if (props.class instanceof Set)
    props.class = new Set(props.class)
  if (props.style instanceof Map)
    props.style = new Map(props.style)
  return { ...source, props }
}

/** Strict resolver used by the opt-in precompiled-only server entry. */
export function resolvePrecompiledTags(head: Unhead<any>, options?: ResolveTagsOptions): HeadTag[] {
  // A normalization hook must still see the build-precomputed default entry.
  // Adapt it to the same carrier seam instead of pulling the raw normalizer
  // back into the strict runtime.
  const entry = head.entries.get(1)
  if (entry?._precomputedTags && !Array.isArray((entry.input as any)?._t)) {
    const raw = entry.input
    const tags = entry._precomputedTags
    entry.input = Object.assign(Object.create({
      _r: () => tags.map(clonePrecomputedTag),
      toJSON: () => raw,
    }), { _t: tags })
  }
  return resolveTagsWithNormalizer(head, options, rejectDynamicEntry)
}
