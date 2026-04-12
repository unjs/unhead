import type { CreateClientHeadOptions, CreateServerHeadOptions, SSRHeadPayload } from 'unhead/types'
import type { UseHeadInput, VueHeadClient } from './types'
import { DeprecationsPlugin } from 'unhead/legacy'
import { createHead as _createClientHead } from './client'
import { createHead as _createServerHead } from './server'

export * from './client'
export { createHead as createClientHead } from './client'

/**
 * Creates a client `VueHeadClient` with the v2 {@link DeprecationsPlugin} pre-registered so that
 * tag props (`children`, `hid`, `vmid`, `body`) continue to work during the migration to v3.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: CreateClientHeadOptions = {}): VueHeadClient<UseHeadInput, boolean> {
  return _createClientHead({
    ...options,
    plugins: [DeprecationsPlugin, ...(options.plugins || [])],
  })
}

/**
 * Creates a server `VueHeadClient` with the v2 {@link DeprecationsPlugin} pre-registered.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createServerHead(options: Omit<CreateServerHeadOptions, 'propsResolver'> = {}): VueHeadClient<UseHeadInput, SSRHeadPayload> {
  return _createServerHead({
    ...options,
    plugins: [DeprecationsPlugin, ...(options.plugins || [])],
  })
}
