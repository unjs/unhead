import type { HookableCore } from 'hookable'
import type { CreateServerHeadOptions, ResolvableHead, ServerHeadHooks, SSRHeadPayload, Unhead } from '../types'
import { createUnhead, registerPlugin } from '../unhead'
import { createHooks } from '../utils/hooks'
import { createServerRenderer } from './renderSSRHead'
import { capoTagWeight } from './sort'

export interface ServerUnhead<T = ResolvableHead> extends Unhead<T, SSRHeadPayload> {
  hooks: HookableCore<ServerHeadHooks<T>>
}

type CreateServerHeadArgs<Input> = ResolvableHead extends Input
  ? [options?: CreateServerHeadOptions<Input, Input>]
  : [options: CreateServerHeadOptions<Input, Input> & { disableDefaults: true }]

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options?: CreateServerHeadOptions<ResolvableHead>): ServerUnhead<ResolvableHead>
export function createHead<T>(options: CreateServerHeadOptions<T, T> & { disableDefaults: true }): ServerUnhead<T>
export function createHead<T>(options: CreateServerHeadOptions<T, T | ResolvableHead>): ServerUnhead<T | ResolvableHead>
export function createHead<T = ResolvableHead>(...args: CreateServerHeadArgs<T>): ServerUnhead<T>
export function createHead<T = ResolvableHead>(options: CreateServerHeadOptions<T, any> = {}): ServerUnhead<T> {
  const tagWeight = options.tagWeight || capoTagWeight
  const render = createServerRenderer({ tagWeight, omitLineBreaks: options.omitLineBreaks })
  const core = createUnhead<T, SSRHeadPayload>(render, {
    _tagWeight: tagWeight,
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
          } as T,
      ...(options.init || []),
    ],
  })

  const hooks = createHooks<ServerHeadHooks<T>>(options.hooks)
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
