import type { CompiledServerHeadOptions } from 'unhead/compiled/server'
import type { CreateServerHeadOptions, SSRHeadPayload } from 'unhead/types'
import type { UseHeadInput, VueHeadClient } from '../types'
import { createHead as _createServerHead } from 'unhead/compiled/server'
import { vueInstall } from '../install'
import { VueResolver } from '../resolver'

export { VueHeadMixin } from '../VueHeadMixin'
export { type PreparedTemplate, prepareHeadInput, prepareTemplate, propsToString, renderSSRHead, type SSRHeadPayload, transformHtmlTemplate } from 'unhead/compiled/server'

/**
 * `createHead` from `@unhead/vue/server`, on the compiled head. It takes compiled tags as
 * well as loose input.
 *
 * @experimental
 */
/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: Omit<CompiledServerHeadOptions, 'propResolvers'> = {}): VueHeadClient<UseHeadInput, SSRHeadPayload> {
  const head = _createServerHead({
    ...options,
    propResolvers: [VueResolver],
  }) as unknown as VueHeadClient<UseHeadInput, SSRHeadPayload>
  head.install = vueInstall(head)
  return head
}

export type {
  CreateServerHeadOptions,
  VueHeadClient,
}
