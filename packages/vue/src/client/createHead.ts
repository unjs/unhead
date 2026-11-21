import type { createDomRenderer, createHead } from 'unhead/client'
import type { CreateClientHeadOptions } from 'unhead/types'
import type { UseHeadInput, VueHeadClient } from '../types'
import { vueInstall } from '../install'

export function createVueHead(
  options: CreateClientHeadOptions,
  createCoreHead: typeof createHead,
  createRenderer: typeof createDomRenderer,
): VueHeadClient<UseHeadInput, boolean> {
  const domRenderer = createRenderer()
  let head: VueHeadClient<UseHeadInput, boolean>
  let renderId = 0
  const debouncedRenderer = () => {
    const id = ++renderId
    setTimeout(() => {
      if (id === renderId)
        domRenderer(head)
    }, 0)
  }
  head = createCoreHead({ render: debouncedRenderer, ...options }) as VueHeadClient<UseHeadInput, boolean>
  head.install = vueInstall(head)
  return head
}
