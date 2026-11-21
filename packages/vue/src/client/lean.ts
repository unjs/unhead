import type { CreateClientHeadOptions } from 'unhead/types'
import type { UseHeadInput, VueHeadClient } from '../types'
import { createHead as createCoreHead, createDomRenderer } from 'unhead/client/lean'
import { createVueHead } from './createHead'

export type { CreateClientHeadOptions, VueHeadClient }
export { VueHeadMixin } from '../VueHeadMixin'
export { enableDomEventHandlers, renderDOMHead } from 'unhead/client/lean'

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: CreateClientHeadOptions = {}): VueHeadClient<UseHeadInput, boolean> {
  return createVueHead(options, createCoreHead, createDomRenderer)
}
