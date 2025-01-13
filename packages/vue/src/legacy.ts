import type { UseFunctionType, UseScriptContext, UseScriptInput, UseScriptOptions } from '@unhead/scripts/vue-legacy'
import type { VueHeadClient } from './types'
import { useScript as legacyUseScript } from '@unhead/scripts/vue-legacy'
import { defineHeadPlugin } from '@unhead/shared'
import { unheadCtx } from 'unhead'
import { createHead } from './client'
import { injectHead } from './composables/injectHead'
import { createHead as createServerHead } from './server'

export * from './index'
export { resolveScriptKey } from '@unhead/scripts/vue-legacy'
export { createServerHead }
export { createHead }

export const CapoPlugin = () => defineHeadPlugin({})

/**
 * @deprecated Please switch to non-legacy version
 */
export function useScript<T extends Record<symbol | string, any> = Record<symbol | string, any>>(input: UseScriptInput, options?: UseScriptOptions<T>): UseScriptContext<UseFunctionType<UseScriptOptions<T>, T>> {
  return legacyUseScript(input, {
    head: injectHead(),
    ...options,
  })
}

/**
 * @deprecated Please switch to non-legacy version
 */
export function setHeadInjectionHandler(handler: () => VueHeadClient<any> | undefined) {
  unheadCtx.set(handler(), true)
}
