import type { CreateStreamableServerHeadOptions } from 'unhead/types'
import type { VueHeadClient } from '../types'
import { createStreamableHead as _createStreamableHead } from 'unhead/stream/server'
import { vueInstall } from '../install'
import { VueResolver } from '../resolver'

export * from '../server'

export function createStreamableHead(options: Omit<CreateStreamableServerHeadOptions, 'propsResolver'> = {}): VueHeadClient {
  const head = _createStreamableHead({
    ...options,
    propResolvers: [VueResolver],
  }) as VueHeadClient
  head.install = vueInstall(head)
  return head
}

export type {
  CreateStreamableServerHeadOptions,
  VueHeadClient,
}

export {
  renderSSRHeadClosing,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  streamWithHead,
} from 'unhead/stream/server'
