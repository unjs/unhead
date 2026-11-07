import type { HookableCore } from 'hookable'
import type { CreateServerHeadOptions, HeadTag, PropResolver, ResolvableHead, ServerHeadHooks, SSRHeadPayload, Unhead } from '../types'
import { createUnhead } from '../unhead'
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
const serverPropResolver: PropResolver = /* @__PURE__ */ Object.assign(
  (k?: string, v?: any) => {
    if (k && k.startsWith('on') && typeof v === 'function') {
      return `this.dataset.${k}fired = true`
    }
    return v
  },
  { _static: true },
)

// normalized tags per entry index (`_i`), computed lazily once per process
let defaultInitTags: HeadTag[][] | undefined
let preparedInputs: WeakMap<object, HeadTag[][]> | undefined

/**
 * Normalizes entry input into resolved tags for the entry at `entryIndex`,
 * weighted with `capoTagWeight`.
 *
 * @internal
 */
export function precomputeEntryTags(input: any, entryIndex: number, propResolvers: PropResolver[]): HeadTag[] {
  const tags = normalizeEntryToTags(input, propResolvers)
  for (let i = 0; i < tags.length; i++) {
    const t = tags[i]
    t._w = capoTagWeight(t)
    t._p = (entryIndex << 10) + i
    t._d = dedupeKey(t)
    if (!t._d)
      t._h = hashTag(t)
  }
  return tags
}

/**
 * Marks static head input so server heads that receive it through `init`
 * normalize it once per process instead of once per request.
 *
 * The input is resolved once and the resulting tags are shared across heads,
 * so it must be plain data that is not mutated afterwards. Keep it at process
 * scope. Heads with entry hooks, a custom tag weight or non-static prop
 * resolvers normalize it per request as usual.
 *
 * @experimental The prepared-input API may change in a future minor release.
 *
 * @example
 * ```ts
 * const appHead = prepareHeadInput({ htmlAttrs: { lang: 'en' }, title: 'My App' })
 * // per request
 * const head = createHead({ init: [appHead] })
 * ```
 */
export function prepareHeadInput<T extends object>(input: T): T {
  const prepared = preparedInputs ||= new WeakMap()
  if (!prepared.has(input))
    prepared.set(input, [])
  return input
}

/* @__NO_SIDE_EFFECTS__ */
export function createHead<T = ResolvableHead>(options: CreateServerHeadOptions = {}): ServerUnhead<T> {
  const tagWeight = options.tagWeight || capoTagWeight
  const core = createUnhead<T, SSRHeadPayload>(createServerRenderer({ tagWeight, omitLineBreaks: options.omitLineBreaks }), {
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

  // fast path: skip re-normalizing the default and prepared init entries per
  // request. Only when the entry is byte-for-byte the precomputed one: default
  // tag weights (capo) and every custom propResolver marked `_static`, i.e.
  // identity for the entry's plain static values (e.g. VueResolver).
  if (tagWeight === capoTagWeight && !options.propResolvers?.some(r => !r._static)) {
    for (const entry of core.entries.values()) {
      const input = entry.input as object
      const cache = input === DEFAULT_INIT ? (defaultInitTags ||= []) : preparedInputs?.get(input)
      if (cache)
        entry._precomputedTags = cache[entry._i] ||= precomputeEntryTags(input, entry._i, core.resolvedOptions.propResolvers!)
    }
  }

  core.hooks = createHooks<ServerHeadHooks>(options.hooks)

  // Register plugins
  options.plugins?.forEach(p => core.use(p))

  return core as ServerUnhead<T>
}
