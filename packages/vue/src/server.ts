import type { VueHeadClient } from '@unhead/vue'
import type { CreateServerHeadOptions, MergeHead } from 'unhead/types'
import { createHead as _createHead } from 'unhead/server'
import { vueInstall } from './install'
import { VuePropResolver } from './resolver'

export { VueHeadMixin } from './VueHeadMixin'
export * from 'unhead/server'

export function createHead<T extends MergeHead>(options: CreateServerHeadOptions = {}): VueHeadClient<T> {
  const head = _createHead({
    propResolvers: [
      VuePropResolver,
    ],
    ...options,
  }) as VueHeadClient<T>
  head.install = vueInstall(head)
  return head
}
