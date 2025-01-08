import type { CreateHeadOptions, MergeHead } from '@unhead/schema'
import type { MaybeComputedRef, ReactiveHead, VueHeadClient } from '@unhead/vue'
import { createHead as _createHead } from 'unhead/client'
import { nextTick } from 'vue'
import { vueInstall } from '../createHead'
import VueReactivityPlugin from '../plugins/VueReactivityPlugin'

export function createHead<T extends MergeHead>(options: CreateHeadOptions = {}): VueHeadClient<T> {
  options.domDelayFn = options.domDelayFn || (fn => nextTick(() => setTimeout(() => fn(), 0)))
  const head = _createHead<MaybeComputedRef<ReactiveHead<T>>>(options) as VueHeadClient<T>
  head.use(VueReactivityPlugin)
  head.install = vueInstall(head)
  return head
}
