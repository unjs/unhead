import type { VueHeadClient } from '../types'
import { defineHeadPlugin } from '@unhead/shared'
import { unheadCtx } from 'unhead'
import { createHead } from '../client'
import { createHead as createServerHead } from '../server'

export * from '../index'
export * from './useScript'
export { createServerHead }
export { createHead }

export const CapoPlugin = () => defineHeadPlugin({})

/**
 * @deprecated Please switch to non-legacy version
 */
export function setHeadInjectionHandler(handler: () => VueHeadClient<any> | undefined) {
  unheadCtx.set(handler(), true)
}
