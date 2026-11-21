import type { CreateClientHeadOptions } from 'unhead/types'
import type { UseHeadInput, VueHeadClient } from './types'
import { createHead as _createHead, createDomRenderer } from 'unhead/client'
import { createVueHead } from './client/createHead'

export { VueHeadMixin } from './VueHeadMixin'
export { renderDOMHead } from 'unhead/client'

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: CreateClientHeadOptions = {}): VueHeadClient<UseHeadInput, boolean> {
  return createVueHead(options, _createHead, createDomRenderer)
}

export type {
  CreateClientHeadOptions,
  VueHeadClient,
}
