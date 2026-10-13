import type { HookableCore } from 'hookable'
import type { CreateServerHeadOptions, PropResolver, ResolvableHead, ServerHeadHooks, SSRHeadPayload, Unhead } from '../types'
import { createUnhead } from '../unhead'
import { createHooks } from '../utils/hooks'
import { createServerRenderer } from './renderSSRHead'
import { capoTagWeight } from './sort'

export interface ServerUnhead<T = ResolvableHead> extends Unhead<T, SSRHeadPayload> {
  hooks: HookableCore<ServerHeadHooks>
}

const DEFAULT_HTML_ATTRS = { lang: 'en' }
const DEFAULT_CHARSET = { charset: 'utf-8' }
const DEFAULT_VIEWPORT = { name: 'viewport', content: 'width=device-width, initial-scale=1' }
const DEFAULT_INIT = { htmlAttrs: DEFAULT_HTML_ATTRS, meta: [DEFAULT_CHARSET, DEFAULT_VIEWPORT] }

// Per-instance clone in createHead: the precomputed tags are exposed verbatim
// through the public resolveTags return value, which callers may mutate. A
// shared array would leak those mutations into other head instances.
const DEFAULT_INIT_TAGS = [
  { props: DEFAULT_HTML_ATTRS, _w: 100, _d: 'htmlAttrs' },
  { props: DEFAULT_CHARSET, _w: -20, _d: 'charset' },
  { props: DEFAULT_VIEWPORT, _w: -15, _d: 'meta:viewport' },
]

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

  if (!options.disableDefaults && !options.tagWeight && !options.propResolvers?.some(r => !r._static)) {
    const defaultEntry = core.entries.get(1)
    if (defaultEntry)
      defaultEntry._precomputedTags = DEFAULT_INIT_TAGS.map((tag, i) => ({ ...tag, tag: i ? 'meta' : 'htmlAttrs', props: { ...tag.props }, _p: 1024 + i }))
  }

  core.hooks = createHooks<ServerHeadHooks>(options.hooks)

  // Register plugins
  options.plugins?.forEach(p => core.use(p))

  return core as ServerUnhead<T>
}
