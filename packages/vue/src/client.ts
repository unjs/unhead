import type { CreateClientHeadOptions, ResolvableHead } from 'unhead/types'
import type { VueHeadClient } from './types'
import { createHead as _createHead, createDomRenderer } from 'unhead/client'
import { vueInstall } from './install'

export { VueHeadMixin } from './VueHeadMixin'
export { renderDOMHead } from 'unhead/client'

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: CreateClientHeadOptions = {}): VueHeadClient<ResolvableHead, boolean> {
  const domRenderer = createDomRenderer()
  let head: VueHeadClient<ResolvableHead, boolean>
  let renderId = 0
  const debouncedRenderer = () => {
    const id = ++renderId
    setTimeout(() => {
      if (id === renderId)
        domRenderer(head)
    }, 0)
  }
  head = _createHead({ render: debouncedRenderer, ...options }) as VueHeadClient<ResolvableHead, boolean>
  head.install = vueInstall(head)
  return head
}

export type {
  CreateClientHeadOptions,
  VueHeadClient,
}
