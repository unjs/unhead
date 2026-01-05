import type { HookableCore } from 'hookable'
import type { CreateServerHeadOptions, ResolvableHead, ServerHeadHooks, SSRHeadPayload, Unhead } from '../types'
import { createUnhead, registerPlugin } from '../unhead'
import { createHooks } from '../utils/hooks'
import { createServerRenderer } from './renderSSRHead'
import { capoTagWeight } from './sort'

export interface ServerUnhead<T = ResolvableHead> extends Unhead<T, SSRHeadPayload> {
  hooks: HookableCore<ServerHeadHooks>
}

/* @__NO_SIDE_EFFECTS__ */
export function createHead<T = ResolvableHead>(options: CreateServerHeadOptions = {}): ServerUnhead<T> {
  const core = createUnhead<T, SSRHeadPayload>(createServerRenderer({ tagWeight: capoTagWeight }), {
    _tagWeight: capoTagWeight,
    // @ts-expect-error untyped
    document: false,
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
      options.disableDefaults
        ? undefined
        : {
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
          },
      ...(options.init || []),
    ],
  })

  const hooks = createHooks<ServerHeadHooks>(options.hooks)
  const head: ServerUnhead<T> = {
    ...core,
    hooks,
    use: p => registerPlugin(head, p),
  }

  // Register plugins
  options.plugins?.forEach(p => registerPlugin(head, p))

  head._ssrPayload = {}
  registerPlugin(head, {
    key: 'server',
    hooks: {
      'tags:resolve': function (ctx) {
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
      },
    },
  })
  return head
}
