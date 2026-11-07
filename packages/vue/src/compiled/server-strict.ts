import type { CompiledEntryOptions, CompiledTags } from 'unhead/compiled/server'
import type { StrictHeadOptions } from 'unhead/compiled/server-strict'
import type { CreateServerHeadOptions, SSRHeadPayload } from 'unhead/types'
import type { UseHeadInput, VueHeadClient } from '../types'
import { createHead as _createServerHead } from 'unhead/compiled/server-strict'
import { vueInstall } from '../install'

export { renderSSRHead, type SSRHeadPayload, type StrictHeadOptions, templateParams } from 'unhead/compiled/server-strict'

/**
 * A Vue server head that takes compiled tags only, with their values.
 *
 * @experimental
 */
export type StrictVueHeadClient = VueHeadClient<CompiledTags, SSRHeadPayload> & {
  push: (input: CompiledTags, options?: CompiledEntryOptions) => ActiveHeadEntry<CompiledTags>
}

/**
 * Creates a server head that renders compiled tags only, with no loose path and no hooks.
 *
 * @experimental
 */
/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: StrictHeadOptions = {}): StrictVueHeadClient {
  const head = _createServerHead(options) as unknown as StrictVueHeadClient
  head.install = vueInstall(head)
  return head
}

export type {
  CreateServerHeadOptions,
  VueHeadClient,
}
