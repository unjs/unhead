/** @experimental v4 preview surface: semver-exempt until v4 stabilizes. See packages/unhead/V4_DESIGN.md. */
import type { V4Head } from 'unhead/v4'
import type { UseHeadInput } from './types'
import { walkResolver } from 'unhead/utils'
import { F_ID, F_PREBUILT, F_RAW, F_REMOVED, TAG_NAMES } from 'unhead/v4'
import { VueResolver } from './resolver'

export { VueResolver, walkResolver }

/** Resolve refs, computeds and getters in head input (v3 parity). */
export function resolveUnrefHeadInput(input: UseHeadInput): Record<string, any> {
  return walkResolver(input, VueResolver)
}

export interface ResolvedTag {
  tag: string
  props: Record<string, any>
  innerHTML?: string
  textContent?: string
}

/**
 * v3-shaped `resolveTags` for a v4 head: flattens the resolved tag set back to
 * `{ tag, props, innerHTML?, textContent? }` objects. Covers consumers like
 * Nuxt's prefetch-preload-tags server plugin, which fishes link tags out of the
 * head after render (alias `unhead/utils` here when running Nuxt on v4).
 * Prebuilt (sealed plan) tags carry final html instead of props and are skipped.
 */
export function resolveTags(head: V4Head): ResolvedTag[] {
  const out: ResolvedTag[] = []
  for (const t of head.resolve()) {
    if (t.f & (F_REMOVED | F_PREBUILT))
      continue
    const props: Record<string, any> = {}
    if (t.p) {
      for (const k in t.p) {
        const v = t.p[k]
        props[k] = v instanceof Set
          ? [...v].join(' ')
          : v instanceof Map
            ? [...v].map(([sk, sv]) => `${sk}:${sv}`).join(';')
            : v
      }
    }
    const tag: ResolvedTag = { tag: TAG_NAMES[t.f & F_ID], props }
    if (t.c != null)
      tag[t.f & F_RAW ? 'innerHTML' : 'textContent'] = t.c
    out.push(tag)
  }
  return out
}
