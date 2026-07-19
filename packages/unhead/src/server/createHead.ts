import type { HookableCore } from 'hookable'
import type { CreateServerHeadOptions, PropResolver, ResolvableHead, ServerHeadHooks, SSRHeadPayload, Unhead } from '../types'
import { createUnhead, registerPlugin } from '../unhead'
import { createHooks } from '../utils/hooks'
import { DEFAULT_INIT, DEFAULT_INIT_TAGS } from './defaults'
import { createServerRenderer } from './renderSSRHead'
import { capoTagWeight } from './sort'

export interface ServerUnhead<T = ResolvableHead> extends Unhead<T, SSRHeadPayload> {
  hooks: HookableCore<ServerHeadHooks>
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
