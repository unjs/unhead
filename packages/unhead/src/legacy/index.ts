import type { CreateClientHeadOptions, CreateServerHeadOptions, ResolvableHead, SSRHeadPayload, Unhead } from '../types'
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
export const legacyPlugins = [DeprecationsPlugin, PromisesPlugin, TemplateParamsPlugin, AliasSortingPlugin] as const

/**
 * @deprecated Will be removed in v4. This global singleton exists only to support the legacy
 * `getActiveHead()` API; use the `Unhead` instance returned by `createHead`/`createServerHead` directly instead.
 */
export const activeHead: { value: unknown } = { value: null }

/**
 * @deprecated Will be removed in v4. Store and use the `Unhead` instance returned by
 * `createHead`/`createServerHead` directly instead of reading it from a global singleton.
 * The requested generics are caller assertions.
 */
export function getActiveHead<T extends object = ResolvableHead, RenderResult = unknown>(): Unhead<T, RenderResult> | null {
  return activeHead.value as Unhead<T, RenderResult> | null
}

/**
 * @deprecated Will be removed in v4. Use `createHead` from `unhead/client` instead; register
 * `legacyPlugins` yourself if you still need v1/v2 tag prop compatibility.
 */
export function createHead<T extends object = ResolvableHead>(options: CreateClientHeadOptions<T, boolean> = {}): Unhead<T, boolean> {
  const head = _createClientHead<T>({
    ...options,
    plugins: [...legacyPlugins, ...(options.plugins || [])],
  })
  activeHead.value = head
  return head
}

type CreateLegacyServerHeadArgs<Input extends object> = ResolvableHead extends Input
  ? [options?: Omit<CreateServerHeadOptions<Input>, 'propResolvers'>]
  : [options: Omit<CreateServerHeadOptions<Input>, 'propResolvers'> & { disableDefaults: true }]

/** @deprecated Will be removed in v4. Use `createServerHead` from `unhead/server` instead; register `legacyPlugins` yourself if you still need v1/v2 tag prop compatibility. */
export function createServerHead(options?: Omit<CreateServerHeadOptions<ResolvableHead>, 'propResolvers'>): Unhead<ResolvableHead, SSRHeadPayload>
/** @deprecated Will be removed in v4. Use `createServerHead` from `unhead/server` instead; register `legacyPlugins` yourself if you still need v1/v2 tag prop compatibility. */
export function createServerHead<T extends object>(options: Omit<CreateServerHeadOptions<T>, 'propResolvers'> & { disableDefaults: true }): Unhead<T, SSRHeadPayload>
/** @deprecated Will be removed in v4. Use `createServerHead` from `unhead/server` instead; register `legacyPlugins` yourself if you still need v1/v2 tag prop compatibility. */
export function createServerHead<T extends object>(options: Omit<CreateServerHeadOptions<T>, 'propResolvers'>): Unhead<T | ResolvableHead, SSRHeadPayload>
/** @deprecated Will be removed in v4. Use `createServerHead` from `unhead/server` instead; register `legacyPlugins` yourself if you still need v1/v2 tag prop compatibility. */
export function createServerHead<T extends object = ResolvableHead>(...args: CreateLegacyServerHeadArgs<T>): Unhead<T, SSRHeadPayload>
export function createServerHead<T extends object = ResolvableHead>(options: Omit<CreateServerHeadOptions<T>, 'propResolvers'> = {}): Unhead<T, SSRHeadPayload> {
  const head = _createServerHead<T>({
    ...options,
    plugins: [...legacyPlugins, ...(options.plugins || [])],
  } as CreateServerHeadOptions<T> & { disableDefaults: true })
  activeHead.value = head
  return head
}

/**
 * @deprecated Will be removed in v4. Use `createUnhead` from `unhead` directly.
 */
export const createHeadCore = createUnhead
