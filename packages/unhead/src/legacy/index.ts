import type { CreateClientHeadOptions, CreateServerHeadOptions, HeadPluginInput, ResolvableHead, Unhead } from '../types'
import { createHead as _createClientHead } from '../client'
import { AliasSortingPlugin } from '../plugins/aliasSorting'
import { DeprecationsPlugin } from '../plugins/deprecations'
import { PromisesPlugin } from '../plugins/promises'
import { TemplateParamsPlugin } from '../plugins/templateParams'
import { createHead as _createServerHead } from '../server'
import { createUnhead } from '../unhead'

export { DeprecationsPlugin }

/**
 * The v2 migration plugins applied by the legacy `createHead`/`createServerHead`, including
 * Promise input resolution. Modern entrypoints require `PromisesPlugin` to be registered explicitly.
 *
 * @deprecated Will be removed in v4. Migrate call sites to the v3 API and construct
 * `createHead`/`createServerHead` from `unhead/client`/`unhead/server` without this plugin set.
 */
export const legacyPlugins: HeadPluginInput[] = [DeprecationsPlugin, PromisesPlugin, TemplateParamsPlugin, AliasSortingPlugin]

/**
 * @deprecated Will be removed in v4. This global singleton exists only to support the legacy
 * `getActiveHead()` API; use the `Unhead` instance returned by `createHead`/`createServerHead` directly instead.
 */
export const activeHead: { value: Unhead<any> | null } = { value: null }

/**
 * @deprecated Will be removed in v4. Store and use the `Unhead` instance returned by
 * `createHead`/`createServerHead` directly instead of reading it from a global singleton.
 */
export function getActiveHead<T extends Record<string, any> = ResolvableHead>(): Unhead<T> | null {
  return activeHead.value
}

/**
 * @deprecated Will be removed in v4. Use `createHead` from `unhead/client` instead; register
 * `legacyPlugins` yourself if you still need v1/v2 tag prop compatibility.
 */
export function createHead<T extends Record<string, any> = ResolvableHead>(options: CreateClientHeadOptions = {}): Unhead<T> {
  return activeHead.value = _createClientHead<T>({
    ...options,
    plugins: [...legacyPlugins, ...(options.plugins || [])],
  })
}

/**
 * @deprecated Will be removed in v4. Use `createServerHead` from `unhead/server` instead; register
 * `legacyPlugins` yourself if you still need v1/v2 tag prop compatibility.
 */
export function createServerHead<T extends Record<string, any> = ResolvableHead>(options: Omit<CreateServerHeadOptions, 'propResolvers'> = {}): Unhead<T> {
  return activeHead.value = _createServerHead<T>({
    ...options,
    plugins: [...legacyPlugins, ...(options.plugins || [])],
  })
}

/**
 * @deprecated Will be removed in v4. Use `createUnhead` from `unhead` directly.
 */
export const createHeadCore = createUnhead
