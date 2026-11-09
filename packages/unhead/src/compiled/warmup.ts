import type { HeadEntryOptions } from '../types'
import type { CompiledTags } from './types'

// The capo weights of the warmup rels, with the `high` priority offset of -1
const WARMUP_WEIGHTS: Record<string, number> = { 'preload': 69, 'preconnect': 19, 'dns-prefetch': 89 }
// The attributes `useScript` sets on a warmup link. None of them changes a weight or a dedupe key.
const WARMUP_ATTR_RE = /^(?:rel|href|as|crossorigin|referrerpolicy|fetchpriority|integrity)$/

/**
 * Returns the compiled tags `compileTags` makes of a warmup link, such as the one `useScript`
 * pushes, or the input as it is. The compiled server head calls it on each push, and the compiled
 * client runtime at each render. So the link never loads the full runtime, and a head without
 * compiler mode carries none of this code.
 * `compiled/client` keeps a copy, so its chunk imports nothing.
 */
export function compileWarmup(input: any, options?: HeadEntryOptions): any {
  const link = options?.tagPriority === 'high' && input?.link
  if (!link || link.length !== 1 || Object.keys(input).length !== 1)
    return input
  const props: Record<string, string> = {}
  for (const key in link[0]) {
    const value = link[0][key]
    if (value !== undefined) {
      if (typeof value !== 'string' || !WARMUP_ATTR_RE.test(key))
        return input
      props[key] = value
    }
  }
  const weight = WARMUP_WEIGHTS[props.rel!]
  return weight && props.href
    ? [['link', props, weight, `link:${props.rel}:${props.href}`, { tagPriority: 'high' }, 1]] satisfies CompiledTags
    : input
}
