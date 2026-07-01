import type { CreateServerHeadOptions, SSRHeadPayload } from 'unhead/types'
import type { UseHeadInput, VueHeadClient } from './types'
import { createHead as _createServerHead } from 'unhead/server'
import { vueInstall } from './install'
import { VueResolver } from './resolver'

export { VueHeadMixin } from './VueHeadMixin'
export { propsToString, renderSSRHead, type SSRHeadPayload, transformHtmlTemplate } from 'unhead/server'

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: Omit<CreateServerHeadOptions, 'propsResolver'> = {}): VueHeadClient<UseHeadInput, SSRHeadPayload> {
  const head = _createServerHead({
    ...options,
    propResolvers: [VueResolver],
  }) as VueHeadClient<UseHeadInput, SSRHeadPayload>
  head.install = vueInstall(head)
  return head
}

export type {
  CreateServerHeadOptions,
  VueHeadClient,
}
