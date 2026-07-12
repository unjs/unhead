import type { CreateServerHeadOptions as CoreCreateServerHeadOptions, SSRHeadPayload } from 'unhead/types'
import type { UseHeadInput, VueHeadClient } from './types'
import { createHead as _createServerHead } from 'unhead/server'
import { vueInstall } from './install'
import { VueResolver } from './resolver'

export { VueHeadMixin } from './VueHeadMixin'
export { propsToString, renderSSRHead, type SSRHeadPayload, transformHtmlTemplate } from 'unhead/server'

export type CreateServerHeadOptions<I extends UseHeadInput = UseHeadInput> = Omit<CoreCreateServerHeadOptions<I>, 'propResolvers'>
type CreateServerHeadArgs<Input extends UseHeadInput> = UseHeadInput extends Input
  ? [options?: CreateServerHeadOptions<Input>]
  : [options: CreateServerHeadOptions<Input> & { disableDefaults: true }]

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options?: CreateServerHeadOptions<UseHeadInput>): VueHeadClient<UseHeadInput, SSRHeadPayload>
export function createHead<I extends UseHeadInput>(options: CreateServerHeadOptions<I> & { disableDefaults: true }): VueHeadClient<I, SSRHeadPayload>
export function createHead<I extends UseHeadInput>(options: CreateServerHeadOptions<I>): VueHeadClient<I | UseHeadInput, SSRHeadPayload>
export function createHead<I extends UseHeadInput = UseHeadInput>(...args: CreateServerHeadArgs<I>): VueHeadClient<I, SSRHeadPayload>
export function createHead<I extends UseHeadInput = UseHeadInput>(options: CreateServerHeadOptions<I> = {}): VueHeadClient<I, SSRHeadPayload> {
  const head = _createServerHead<I>({
    ...options,
    propResolvers: [VueResolver],
  } as CoreCreateServerHeadOptions<I> & { disableDefaults: true }) as VueHeadClient<I, SSRHeadPayload>
  head.install = vueInstall(head)
  return head
}

export type {
  VueHeadClient,
}
