import type { HookableCore } from 'hookable'
import type { CreateServerHeadOptions, ResolvableHead, ServerHeadHooks, SSRHeadPayload, Unhead } from '../types'
import { createUnhead, registerPlugin } from '../unhead'
import { createHooks } from '../utils/hooks'
import { defineStaticEntry } from '../utils/staticEntry'
import { createServerRenderer } from './renderSSRHead'
import { capoTagWeight } from './sort'

// module scope: normalized once per process, tags shared across all requests
const DEFAULT_INIT = /* @__PURE__ */ defineStaticEntry({
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
})

export interface ServerUnhead<T = ResolvableHead> extends Unhead<T, SSRHeadPayload> {
  hooks: HookableCore<ServerHeadHooks>
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
      (k, v) => {
        if (k && k.startsWith('on') && typeof v === 'function') {
          return `this.dataset.${k}fired = true`
        }
        return v
      },
    ],
    init: [
      options.disableDefaults ? undefined : DEFAULT_INIT as any,
      ...(options.init || []),
    ],
  })

  const hooks = createHooks<ServerHeadHooks>(options.hooks)
  const head: ServerUnhead<T> = {
    ...core,
    hooks,
    render: () => render(head),
    use: p => registerPlugin(head, p),
  }

  // Register plugins
  options.plugins?.forEach(p => registerPlugin(head, p))

  head._ssrPayload = {}
  const payloadHook = (ctx: { tags: any[] }) => {
    let payload: ResolvableHead = {}
    if (Object.keys(head._ssrPayload || {}).length > 0) {
      payload = { ...head._ssrPayload }
    }
    if (Object.values(payload).some(Boolean)) {
      ctx.tags.push({
        tag: 'script',
        innerHTML: JSON.stringify(payload),
        props: { id: 'unhead:payload', type: 'application/json' },
      })
    }
  }
  registerPlugin(head, {
    key: 'server',
    hooks: {
      'tags:resolve': payloadHook,
    },
  })
  return head
}
