import type { CreateServerHeadOptions, MergeHead } from '@unhead/schema'
import type { MaybeComputedRef, ReactiveHead, VueHeadClient } from '@unhead/vue'
import { createHead as _createServerHead } from 'unhead/server'
import { vueInstall } from './install'
import { VueReactivityPlugin } from './VueReactivityPlugin'

export { VueHeadMixin } from './VueHeadMixin'
export * from 'unhead/server'

export function createHead<T extends MergeHead>(options: CreateServerHeadOptions = {}): VueHeadClient<T> {
  const head = _createServerHead<MaybeComputedRef<ReactiveHead<T>>>({
    ...options,
    plugins: [
      ...(options.plugins || []),
      VueReactivityPlugin,
    ],
  }) as VueHeadClient<T>
  head.install = vueInstall(head)
  return head
}
