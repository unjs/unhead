import type { CreateClientHeadOptions, CreateStreamableClientHeadOptions } from 'unhead/types'
import type { VueHeadClient } from './types'
import { createHead as _createHead, createDebouncedFn, renderDOMHead } from 'unhead/client'
import { nextTick } from 'vue'
import { vueInstall } from './install'
import { VueResolver } from './resolver'

export { VueHeadMixin } from './VueHeadMixin'
export { renderDOMHead } from 'unhead/client'

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: CreateClientHeadOptions = {}): VueHeadClient {
  const head = _createHead({
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), nextTick),
    },
    ...options,
  }) as VueHeadClient
  head.install = vueInstall(head)
  return head
}

export function createStreamableHead(options: CreateStreamableClientHeadOptions = {}): VueHeadClient {
  const { streamKey, ...rest } = options
  const head = _createHead({
    ...rest,
    experimentalStreamKey: streamKey,
    propResolvers: [VueResolver],
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), nextTick),
    },
  }) as VueHeadClient
  head.install = vueInstall(head)
  return head
}

export type {
  CreateClientHeadOptions,
  CreateStreamableClientHeadOptions,
  VueHeadClient,
}
