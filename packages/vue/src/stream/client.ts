import type { CreateStreamableClientHeadOptions as CoreCreateStreamableClientHeadOptions, StreamingGlobal, UnheadStreamQueue } from 'unhead/stream/client'
import type { ResolvableHead } from 'unhead/types'
import type { UseHeadInput, VueHeadClient } from '../types'
import { createStreamableHead as _createStreamableHead } from 'unhead/stream/client'
import { vueInstall } from '../install'
import { VueResolver } from '../resolver'
import { VueHeadMixin } from '../VueHeadMixin'

export type CreateStreamableClientHeadOptions<I = UseHeadInput> = CoreCreateStreamableClientHeadOptions<I>

/**
 * Creates a client head by wrapping the core instance from the iife script.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createStreamableHead(options?: CreateStreamableClientHeadOptions): VueHeadClient<UseHeadInput | ResolvableHead, boolean> | undefined
export function createStreamableHead<I = UseHeadInput>(options?: CreateStreamableClientHeadOptions<I>): VueHeadClient<I | ResolvableHead, boolean> | undefined
export function createStreamableHead<I = UseHeadInput>(options: CreateStreamableClientHeadOptions<I> = {}): VueHeadClient<I | ResolvableHead, boolean> | undefined {
  const head = _createStreamableHead<I>({
    ...options,
    propResolvers: [VueResolver, ...(options.propResolvers || [])],
  }) as VueHeadClient<I | ResolvableHead, boolean> | undefined
  if (head) {
    head.install = vueInstall(head)
  }
  return head
}

export { VueHeadMixin }
export type { StreamingGlobal, UnheadStreamQueue, VueHeadClient }
