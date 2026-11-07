import type { CompiledEntryOptions, CompiledServerHeadOptions, CompiledTags } from 'unhead/compiled/server'
import type { ActiveHeadEntry, CreateServerHeadOptions, SSRHeadPayload } from 'unhead/types'
import type { UseHeadInput, VueHeadClient } from '../types'
import { createHead as _createServerHead } from 'unhead/compiled/server'
import { vueInstall } from '../install'
import { VueResolver } from '../resolver'

export { VueHeadMixin } from '../VueHeadMixin'
export { type CompiledEntryOptions, type CompiledTags, type PreparedTemplate, prepareHeadInput, prepareTemplate, propsToString, renderSSRHead, type SSRHeadPayload, transformHtmlTemplate } from 'unhead/compiled/server'

/**
 * A Vue server head that takes compiled tags, with their values, as well as loose input.
 *
 * @experimental
 */
export type CompiledVueHeadClient = VueHeadClient<UseHeadInput | CompiledTags, SSRHeadPayload> & {
  push: (input: UseHeadInput | CompiledTags, options?: CompiledEntryOptions) => ActiveHeadEntry<UseHeadInput | CompiledTags>
}

/**
 * `createHead` from `@unhead/vue/server`, on the compiled head. It takes compiled tags as
 * well as loose input.
 *
 * @experimental
 */
/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: Omit<CompiledServerHeadOptions, 'propResolvers'> = {}): CompiledVueHeadClient {
  const head = _createServerHead({
    ...options,
    propResolvers: [VueResolver],
  }) as unknown as CompiledVueHeadClient
  head.install = vueInstall(head)
  return head
}

export type {
  CreateServerHeadOptions,
  VueHeadClient,
}
