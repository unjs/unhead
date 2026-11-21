import type { CreateStreamableClientHeadOptions, UnheadStreamQueue } from 'unhead/stream/client'
import type { ResolvableHead } from 'unhead/types'
import type { VueHeadClient } from '../types'
import { createStreamableHead as _createStreamableHead } from 'unhead/stream/client'
import { vueInstall } from '../install'
import { VueHeadMixin } from '../VueHeadMixin'

/**
 * Creates a client head by wrapping the core instance from the iife script.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createStreamableHead(options: CreateStreamableClientHeadOptions = {}): VueHeadClient<ResolvableHead, boolean> | undefined {
  const head = _createStreamableHead(options) as VueHeadClient<ResolvableHead, boolean> | undefined
  if (head) {
    head.install = vueInstall(head)
  }
  return head
}

export { VueHeadMixin }
export type { CreateStreamableClientHeadOptions, UnheadStreamQueue, VueHeadClient }
