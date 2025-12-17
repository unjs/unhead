import type { CreateServerHeadOptions, CreateStreamableServerHeadOptions } from 'unhead/types'
import type { VueHeadClient } from './types'
import { createHead as _createServerHead, createStreamableHead as _createStreamableHead } from 'unhead/server'
import { vueInstall } from './install'
import { VueResolver } from './resolver'

export { VueHeadMixin } from './VueHeadMixin'
export { extractUnheadInputFromHtml, propsToString, renderSSRHead, type SSRHeadPayload, transformHtmlTemplate } from 'unhead/server'
// Experimental streaming support
export {
  renderSSRHeadClosing,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  streamAppWithUnhead,
} from 'unhead/server'

export function createHead(options: Omit<CreateServerHeadOptions, 'propsResolver'> = {}): VueHeadClient {
  const head = _createServerHead({
    ...options,
    propResolvers: [VueResolver],
  }) as VueHeadClient
  head.install = vueInstall(head)
  return head
}

export function createStreamableHead(options: Omit<CreateStreamableServerHeadOptions, 'propsResolver'> = {}): VueHeadClient {
  const head = _createStreamableHead({
    ...options,
    propResolvers: [VueResolver],
  }) as VueHeadClient
  head.install = vueInstall(head)
  return head
}

export type {
  CreateServerHeadOptions,
  CreateStreamableServerHeadOptions,
  VueHeadClient,
}
