import type { CompiledEntryOptions, CompiledTags } from 'unhead/compiled/server'
import type { StrictHeadOptions } from 'unhead/compiled/server-strict'
import type { ActiveHeadEntry, CreateServerHeadOptions, SSRHeadPayload } from 'unhead/types'
import type { UseHeadInput, UseHeadOptions, VueHeadClient } from '../types'
import { createHead as _createServerHead } from 'unhead/compiled/server-strict'
import { inject } from 'vue'
import { headSymbol, vueInstall } from '../install'

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

/**
 * `useHead` for a strict head. It takes compiled tags and skips the client branch of the
 * `@unhead/vue` composable, which a server bundle never runs.
 *
 * @experimental
 */
export function useHead(input: UseHeadInput, options: UseHeadOptions & { values?: readonly unknown[] } = {}): ActiveHeadEntry<any> {
  return (options.head || inject<VueHeadClient>(headSymbol)!).push(input, options as any) as ActiveHeadEntry<any>
}

export type {
  CreateServerHeadOptions,
  VueHeadClient,
}
