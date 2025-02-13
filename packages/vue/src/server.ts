import type { MaybeComputedRef, ReactiveHead, VueHeadClient } from '@unhead/vue'
import type { CreateServerHeadOptions, MergeHead } from 'unhead/types'
import { createHead as _createServerHead } from 'unhead/server'
import { isRef, toValue } from 'vue'
import { vueInstall } from './install'

export { VueHeadMixin } from './VueHeadMixin'
export { extractUnheadInputFromHtml, renderSSRHead, type SSRHeadPayload, transformHtmlTemplate } from 'unhead/server'

export function createHead<T extends MergeHead>(options: Omit<CreateServerHeadOptions, 'propsResolver'> = {}): VueHeadClient<T> {
  const head = _createServerHead<MaybeComputedRef<ReactiveHead<T>>>({
    ...options,
    propResolvers: [
      (_: string, value: any) => isRef(value) ? toValue(value) : value,
    ],
  }) as VueHeadClient<T>
  head.install = vueInstall(head)
  return head
}
