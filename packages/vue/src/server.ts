import type { ActiveHeadEntry, CreateServerHeadOptions, HeadEntryOptions, SSRHeadPayload } from 'unhead/types'
import type { UseHeadInput, UseHeadOptions, UseHeadSafeInput, UseSeoMetaInput, VueHeadClient } from './types'
import { useHead as _useHead, useHeadSafe as _useHeadSafe, useSeoMeta as _useSeoMeta } from 'unhead'
import { createHead as _createServerHead } from 'unhead/server'
import { injectHead, vueInstall } from './install'
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

export function useHead<I = UseHeadInput>(input?: UseHeadInput, options: UseHeadOptions = {}): ActiveHeadEntry<I> {
  return _useHead(options.head || injectHead(), input as any, options as HeadEntryOptions) as ActiveHeadEntry<I>
}

export function useHeadSafe(input: UseHeadSafeInput = {}, options: UseHeadOptions = {}): ActiveHeadEntry<UseHeadSafeInput> {
  return _useHeadSafe(options.head || injectHead(), input as any, options as HeadEntryOptions) as any
}

export function useSeoMeta(input: UseSeoMetaInput = {}, options: UseHeadOptions = {}): ActiveHeadEntry<UseSeoMetaInput> {
  return _useSeoMeta(options.head || injectHead(), input as any, options as HeadEntryOptions) as any
}

/** @deprecated Use `useHead` instead. */
export const useServerHead = useHead
/** @deprecated Use `useHeadSafe` instead. */
export const useServerHeadSafe = useHeadSafe
/** @deprecated Use `useSeoMeta` instead. */
export const useServerSeoMeta = useSeoMeta

export type {
  CreateServerHeadOptions,
  VueHeadClient,
}
