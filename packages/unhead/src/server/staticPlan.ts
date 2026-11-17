import type { ActiveHeadEntry, HeadTag, ResolvableHead, StaticPlanTag } from '../types'
import type { ServerUnhead } from './createHead'
import { STATIC_BODY_ATTRS_TAG, STATIC_HTML_ATTRS_TAG, STATIC_TAG } from './staticPlanTags'

const BODY_POSITIONS = ['head', 'bodyOpen', 'bodyClose'] as const

function planRowToHeadTag(row: StaticPlanTag, entryIndex: number, i: number): HeadTag {
  const [weight, identity, html, position] = row
  const tag: HeadTag = {
    tag: STATIC_TAG,
    props: {},
    _w: weight,
    _p: (entryIndex << 10) + i,
    _html: html,
  }
  if (position === 3) {
    // attrs rows merge into the rendered string (see `ssrRenderTags`), so they
    // must never collide with the real `htmlAttrs` singleton's dedupe key --
    // only with another static row declaring the same identity.
    tag.tag = STATIC_HTML_ATTRS_TAG
    tag._d = `${STATIC_HTML_ATTRS_TAG}:${identity}`
  }
  else if (position === 4) {
    tag.tag = STATIC_BODY_ATTRS_TAG
    tag._d = `${STATIC_BODY_ATTRS_TAG}:${identity}`
  }
  else {
    // same identity format `dedupeKey()` produces for the equivalent real
    // tag, so a plan row and a normal tag dedupe against each other using
    // standard weight/priority rules.
    tag._d = identity
    if (position === 1 || position === 2)
      tag.tagPosition = BODY_POSITIONS[position]
  }
  return tag
}

/**
 * Push a pre-rendered static plan as a single head entry.
 *
 * A plan is build-time output (precompiled `useSeoMeta`, Vite manifest tags,
 * etc.) whose tags already carry their final weight, dedupe identity and
 * rendered HTML. Plan rows skip normalize/resolve entirely -- the SSR
 * renderer splices `html` into the render by weight instead of re-serialising
 * props -- but still dedupe against normal `useHead`/`useSeoMeta` entries by
 * identity, and still flow through `tags:resolve` and other tag-rewriting
 * hooks like any other resolved `HeadTag`.
 *
 * The returned entry is immutable: `patch()` throws. `dispose()` it and push
 * a new plan instead of mutating one in place.
 *
 * @experimental
 */
export function pushStaticPlan<T = ResolvableHead>(
  head: ServerUnhead<T>,
  plan: readonly StaticPlanTag[],
): ActiveHeadEntry<T> {
  // never mutated: each push builds its own tags, the input `plan` array
  // (often a shared module-level const) is read-only to this function.
  const active = head.push({} as T)
  const entry = head.entries.get(active._i)!
  entry._precomputedTags = plan.map((row, i) => planRowToHeadTag(row, entry._i, i))
  entry._static = true
  return {
    ...active,
    patch() {
      throw new Error('[unhead] pushStaticPlan() entries are immutable. dispose() this entry and push a new plan instead of patching it.')
    },
  }
}
