import type { CreateClientHeadOptions } from 'unhead/types'
import type { UseHeadInput, VueHeadClient } from './types'
import { createHead as _createHead, createDomRenderer } from 'unhead/client'
import { vueInstall } from './install'

export { VueHeadMixin } from './VueHeadMixin'
export { renderDOMHead } from 'unhead/client'

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: CreateClientHeadOptions = {}): VueHeadClient<UseHeadInput, boolean> {
  const domRenderer = createDomRenderer()
  let head: VueHeadClient<UseHeadInput, boolean>
  let renderId = 0
  const debouncedRenderer = () => {
    const id = ++renderId
    setTimeout(() => {
      if (id === renderId)
        domRenderer(head)
    }, 0)
  }
  head = _createHead({ render: debouncedRenderer, ...options }) as VueHeadClient<UseHeadInput, boolean>
  head.install = vueInstall(head)
  return head
}

export type {
  CreateClientHeadOptions,
  VueHeadClient,
}
