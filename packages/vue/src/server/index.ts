import type { CreateHeadOptions, MergeHead } from '@unhead/schema'
import type { MaybeComputedRef, ReactiveHead, VueHeadClient } from '@unhead/vue'
import { createHead as _createServerHead } from 'unhead/server'
import { vueInstall } from '../createHead'
import VueReactivityPlugin from '../plugins/VueReactivityPlugin'

export function createHead<T extends MergeHead>(options: Omit<CreateHeadOptions, 'domDelayFn' | 'document'> = {}): VueHeadClient<T> {
  const head = _createServerHead<MaybeComputedRef<ReactiveHead<T>>>(options) as VueHeadClient<T>
  head.use(VueReactivityPlugin)
  head.install = vueInstall(head)
  return head
}
