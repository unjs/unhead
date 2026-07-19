import type { HookableCore } from 'hookable'
import type { CreateServerHeadOptions, HeadTag, PropResolver, ResolvableHead, ServerHeadHooks, SSRHeadPayload, Unhead } from '../types'
import { createUnhead, registerPlugin } from '../unhead'
import { createHooks } from '../utils/hooks'
import { createServerRenderer } from './renderSSRHead'
import { capoTagWeight } from './sort'

export interface ServerUnhead<T = ResolvableHead> extends Unhead<T, SSRHeadPayload> {
  hooks: HookableCore<ServerHeadHooks>
}

// hoisted so per-request `createHead()` calls (e.g. Nuxt) share one object;
// walkResolver/normalizeProps never mutate entry input so sharing is safe
const DEFAULT_HTML_ATTRS = { lang: 'en' }
const DEFAULT_CHARSET = { charset: 'utf-8' }
const DEFAULT_VIEWPORT = { name: 'viewport', content: 'width=device-width, initial-scale=1' }
const DEFAULT_INIT = { htmlAttrs: DEFAULT_HTML_ATTRS, meta: [DEFAULT_CHARSET, DEFAULT_VIEWPORT] }

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

// Generated from DEFAULT_INIT's build-stable normalized output. Keeping this
// literal beside the raw input makes the normal and precompiled-only server
// entries share the same zero-normalization default fast path.
/** @internal */
export const DEFAULT_INIT_TAGS: HeadTag[] = [
  { tag: 'htmlAttrs', props: DEFAULT_HTML_ATTRS, _w: 100, _p: 1024, _d: 'htmlAttrs' },
  { tag: 'meta', props: DEFAULT_CHARSET, _w: -20, _p: 1025, _d: 'charset' },
  { tag: 'meta', props: DEFAULT_VIEWPORT, _w: -15, _p: 1026, _d: 'meta:viewport' },
]

/** @internal */
export function createHeadWithRenderer<T = ResolvableHead>(
  options: CreateServerHeadOptions,
  renderer: typeof createServerRenderer,
): ServerUnhead<T> {
  const tagWeight = options.tagWeight || capoTagWeight
  const render = renderer({ tagWeight, omitLineBreaks: options.omitLineBreaks })
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

  if (!options.disableDefaults && !options.tagWeight && !options.propResolvers?.some(r => !r._static)) {
    const defaultEntry = core.entries.get(1)
    if (defaultEntry)
      defaultEntry._precomputedTags = DEFAULT_INIT_TAGS.map(tag => ({ ...tag, props: { ...tag.props } }))
  }

  const hooks = createHooks<ServerHeadHooks>(options.hooks)
  const head = core as ServerUnhead<T>
  head.hooks = hooks
  head.render = () => render(head)
  head.use = p => registerPlugin(head, p)
  options.plugins?.forEach(p => head.use(p))
  return head
}

/* @__NO_SIDE_EFFECTS__ */
export function createHead<T = ResolvableHead>(options: CreateServerHeadOptions = {}): ServerUnhead<T> {
  return createHeadWithRenderer(options, createServerRenderer)
}
