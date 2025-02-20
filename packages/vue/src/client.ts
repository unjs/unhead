import type { CreateClientHeadOptions, MergeHead } from 'unhead/types'
import type { ReactiveHead, ResolvableValue, VueHeadClient } from './types'
import { createHead as _createHead, createDebouncedFn, renderDOMHead } from 'unhead/client'
import { nextTick } from 'vue'
import { vueInstall } from './install'

export { VueHeadMixin } from './VueHeadMixin'
export { renderDOMHead } from 'unhead/client'

export function createHead<T extends MergeHead>(options: CreateClientHeadOptions = {}): VueHeadClient<T> {
  const head = _createHead<ResolvableValue<ReactiveHead<T>>>({
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), nextTick),
    },
    ...options,
  }) as VueHeadClient<T>
  head.install = vueInstall(head)
  return head
}
