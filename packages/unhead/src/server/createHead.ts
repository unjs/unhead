import type { HookableCore } from 'hookable'
import type { CreateServerHeadOptions, HeadTag, PropResolver, ResolvableHead, ServerHeadHooks, SSRHeadPayload, Unhead } from '../types'
import { createUnhead, registerPlugin } from '../unhead'
import { dedupeKey, hashTag } from '../utils/dedupe'
import { createHooks } from '../utils/hooks'
import { normalizeEntryToTags } from '../utils/normalize'
import { createServerRenderer } from './renderSSRHead'
import { capoTagWeight } from './sort'

export interface ServerUnhead<T = ResolvableHead> extends Unhead<T, SSRHeadPayload> {
  hooks: HookableCore<ServerHeadHooks>
}

// hoisted so per-request `createHead()` calls (e.g. Nuxt) share one object;
// walkResolver/normalizeProps never mutate entry input so sharing is safe
const DEFAULT_INIT = {
  htmlAttrs: {
    lang: 'en',
  },
  meta: [
    {
      charset: 'utf-8',
    },
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1',
    },
  ],
}

// identity for anything but `on*` function handlers, so `_static` for the
// default init fast path (the default entry has no event handlers)
const serverPropResolver: PropResolver = Object.assign(
  (k?: string, v?: any) => {
    if (k && k.startsWith('on') && typeof v === 'function') {
      return `this.dataset.${k}fired = true`
    }
    return v
  },
  { _static: true },
)

let defaultInitTags: HeadTag[] | undefined

/**
 * Normalized tags for {@link DEFAULT_INIT}, computed lazily once per process.
 *
 * Mirrors the first-resolve normalization in `utils/resolve.ts` exactly:
 * the default entry is always the first push (`_i === 1`), it has no `on*`
 * handlers so the server prop resolver is a no-op, and weights use the
 * default `capoTagWeight`. Any deviation from those assumptions must skip
 * attaching the precomputed array (see guards in `createHead`).
 */
function getDefaultInitTags(): HeadTag[] {
  if (!defaultInitTags) {
    defaultInitTags = normalizeEntryToTags(DEFAULT_INIT, [])
    for (let i = 0; i < defaultInitTags.length; i++) {
      const t = defaultInitTags[i]
      t._w = capoTagWeight(t)
      t._p = (1 << 10) + i
      t._d = dedupeKey(t)
      if (!t._d)
        t._h = hashTag(t)
    }
  }
  return defaultInitTags
}

/* @__NO_SIDE_EFFECTS__ */
export function createHead<T = ResolvableHead>(options: CreateServerHeadOptions = {}): ServerUnhead<T> {
  const tagWeight = options.tagWeight || capoTagWeight
  const render = createServerRenderer({ tagWeight, omitLineBreaks: options.omitLineBreaks })
  const core = createUnhead<T, SSRHeadPayload>(render, {
    _tagWeight: tagWeight,
    // @ts-expect-error untyped
    document: false,
    experimentalStreamKey: options.experimentalStreamKey,
    propResolvers: [
      ...(options.propResolvers || []),
      serverPropResolver,
    ],
    init: [
      options.disableDefaults ? undefined : DEFAULT_INIT,
      ...(options.init || []),
    ],
  })

  // fast path: skip re-normalizing the default init entry per request.
  // Only when the entry is byte-for-byte the precomputed one: default tag
  // weights (capo) and every custom propResolver marked `_static`, i.e.
  // identity for the entry's plain static values (e.g. VueResolver; the
  // built-in server resolver is also a no-op as the entry has no `on*`
  // handlers).
  if (!options.disableDefaults && !options.tagWeight && !options.propResolvers?.some(r => !r._static)) {
    // the default entry is the first init push, so `_i === 1`
    const defaultEntry = core.entries.get(1)
    if (defaultEntry)
      defaultEntry._precomputedTags = getDefaultInitTags()
  }

  const hooks = createHooks<ServerHeadHooks>(options.hooks)
  const head: ServerUnhead<T> = {
    ...core,
    hooks,
    render: () => render(head),
    use: p => registerPlugin(head, p),
  }

  // Register plugins
  options.plugins?.forEach(p => registerPlugin(head, p))

  return head
}
