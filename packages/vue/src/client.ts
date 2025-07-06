import type { CreateClientHeadOptions } from 'unhead/types'
import type { VueHeadClient } from './types'
import { createHead as _createHead, createDebouncedFn, renderDOMHead } from 'unhead/client'
import { nextTick } from 'vue'
import { vueInstall } from './install'

export { VueHeadMixin } from './VueHeadMixin'
export { renderDOMHead } from 'unhead/client'

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

export type {
  CreateClientHeadOptions,
  VueHeadClient,
}
