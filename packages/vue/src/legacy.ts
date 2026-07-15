import type { CreateClientHeadOptions, CreateServerHeadOptions, HeadPluginInput, SSRHeadPayload } from 'unhead/types'
import type { UseHeadInput, VueHeadClient } from './types'
import { DeprecationsPlugin } from 'unhead/legacy'
import { AliasSortingPlugin, TemplateParamsPlugin } from 'unhead/plugins'
import { createHead as _createClientHead } from './client'
import { createHead as _createServerHead } from './server'

export * from './client'
/**
 * @deprecated Will be removed in v4. Use `createHead` from `@unhead/vue/client` instead.
 */
export { createHead as createClientHead } from './client'

/**
 * The full v2 migration plugin set applied by the legacy `createHead`/`createServerHead`.
 * Export so users with a custom `createHead` can opt into one-line v2 compatibility.
 *
 * @deprecated Will be removed in v4. Migrate call sites to the v3 API and construct
 * `createHead`/`createServerHead` from `@unhead/vue/client`/`@unhead/vue/server` without this plugin set.
 */
export const legacyPlugins: HeadPluginInput[] = [DeprecationsPlugin, TemplateParamsPlugin, AliasSortingPlugin]

/**
 * Creates a client `VueHeadClient` with the v2 migration plugin set pre-registered so that
 * tag props (`children`, `hid`, `vmid`, `body`), template params, and alias sorting
 * continue to work during the migration to v3.
 *
 * @deprecated Will be removed in v4. Use `createHead` from `@unhead/vue/client` instead; register
 * `legacyPlugins` yourself if you still need v1/v2 tag prop compatibility.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: CreateClientHeadOptions = {}): VueHeadClient<UseHeadInput, boolean> {
  return _createClientHead({
    ...options,
    plugins: [...legacyPlugins, ...(options.plugins || [])],
  })
}

/**
 * Creates a server `VueHeadClient` with the v2 migration plugin set pre-registered.
 *
 * @deprecated Will be removed in v4. Use `createHead` from `@unhead/vue/server` instead; register
 * `legacyPlugins` yourself if you still need v1/v2 tag prop compatibility.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createServerHead(options: Omit<CreateServerHeadOptions, 'propResolvers'> = {}): VueHeadClient<UseHeadInput, SSRHeadPayload> {
  return _createServerHead({
    ...options,
    plugins: [...legacyPlugins, ...(options.plugins || [])],
  })
}
