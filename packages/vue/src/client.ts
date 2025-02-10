import type { VueHeadClient } from '@unhead/vue'
import type { CreateClientHeadOptions, MergeHead } from 'unhead/types'
import { createHead as _createHead, createDebouncedFn, renderDOMHead } from 'unhead/client'
import { nextTick } from 'vue'
import { vueInstall } from './install'

export { VueHeadMixin } from './VueHeadMixin'
export * from 'unhead/client'

export function createHead<T extends MergeHead>(options: CreateClientHeadOptions = {}): VueHeadClient<T> {
  const head = _createHead({
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), nextTick),
    },
    ...options,
  }) as VueHeadClient<T>
  head.install = vueInstall(head)
  return head
}
