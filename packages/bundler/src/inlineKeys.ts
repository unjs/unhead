import type { SerializableHead } from 'unhead/types'
import type { InlineTag } from './inlineTagKey'
import { getInlineTagKey } from './inlineTagKey'

function keyTags<T extends object>(tag: InlineTag, input: T[]): T[] {
  return input.map((entry) => {
    const identity = getInlineTagKey(tag, entry as Record<string, unknown>)
    return identity ? { ...entry, ...identity } : entry
  })
}

/** Add build-time keys before emitting static head data for both SSR and the client. */
export function keyInlineTags(input: SerializableHead): SerializableHead {
  const { script, style, noscript } = input
  return {
    ...input,
    ...(script && { script: keyTags('script', script) }),
    ...(style && { style: keyTags('style', style) }),
    ...(noscript && { noscript: keyTags('noscript', noscript) }),
  }
}
