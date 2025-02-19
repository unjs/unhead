import type { ReactiveHead, ResolvableValue, VueHeadClient } from '@unhead/vue'
import type { CreateServerHeadOptions, MergeHead } from 'unhead/types'
import { createHead as _createServerHead } from 'unhead/server'
import { vueInstall } from './install'
import { VueResolver } from './resolver'

export { VueHeadMixin } from './VueHeadMixin'
export { extractUnheadInputFromHtml, propsToString, renderSSRHead, type SSRHeadPayload, transformHtmlTemplate } from 'unhead/server'

export function createHead<T extends MergeHead>(options: Omit<CreateServerHeadOptions, 'propsResolver'> = {}): VueHeadClient<T> {
  const head = _createServerHead<ResolvableValue<ReactiveHead<T>>>({
    ...options,
    propResolvers: [VueResolver],
  }) as VueHeadClient<T>
  head.install = vueInstall(head)
  return head
}
