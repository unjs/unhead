import type { CreateClientHeadOptions, CreateServerHeadOptions, HeadEntry, HeadTag, ResolvableHead, SSRHeadPayload, Unhead } from '../types'
import { createHead as _createClientHead } from '../client'
import { AliasSortingPlugin } from '../plugins/aliasSorting'
import { defineHeadPlugin } from '../plugins/defineHeadPlugin'
import { PromisesPlugin } from '../plugins/promises'
import { TemplateParamsPlugin } from '../plugins/templateParams'
import { createHead as _createServerHead } from '../server'
import { createUnhead } from '../unhead'

/**
 * Maps unhead v1/v2 tag props (`children`, `hid`, `vmid`, `body`, `renderPriority`) to their
 * v3 equivalents (`innerHTML`, `key`, `tagPosition`, `tagPriority`).
 *
 * Intended as a temporary migration aid. Remove once all call sites use the v3 API.
 */
export const DeprecationsPlugin = /* @__PURE__ */ defineHeadPlugin({
  key: 'deprecations',
  hooks: {
    'entries:normalize': <Input>({ tags }: { tags: HeadTag[], entry: HeadEntry<Input> }) => {
      for (const tag of tags) {
        if (tag.props.children) {
          tag.innerHTML = String(tag.props.children)
          delete tag.props.children
        }
        if (tag.props.hid) {
          tag.key = String(tag.props.hid)
          delete tag.props.hid
        }
        if (tag.props.vmid) {
          tag.key = String(tag.props.vmid)
          delete tag.props.vmid
        }
        if ('body' in tag.props) {
          if (tag.props.body) {
            tag.tagPosition = 'bodyClose'
          }
          delete tag.props.body
        }
        if (tag.props.renderPriority != null) {
          // Legacy inputs accepted arbitrary string/number priorities. Keep that
          // migration behaviour at this compatibility boundary.
          tag.tagPriority = tag.props.renderPriority as HeadTag['tagPriority']
          delete tag.props.renderPriority
        }
      }
    },
  },
})

/**
 * The full v2 migration plugin set applied by the legacy `createHead`/`createServerHead`.
 * Export so users with a custom `createHead` can opt into one-line v2 compatibility.
 */
export const legacyPlugins = [DeprecationsPlugin, PromisesPlugin, TemplateParamsPlugin, AliasSortingPlugin] as const

/** @deprecated Unsafe migration-only global; prefer passing a head explicitly. */
export const activeHead: { value: unknown } = { value: null }

/** @deprecated Unsafe migration-only lookup; the requested generics are caller assertions. */
export function getActiveHead<T extends object = ResolvableHead, RenderResult = unknown>(): Unhead<T, RenderResult> | null {
  return activeHead.value as Unhead<T, RenderResult> | null
}

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

export function createServerHead(options?: Omit<CreateServerHeadOptions<ResolvableHead>, 'propResolvers'>): Unhead<ResolvableHead, SSRHeadPayload>
export function createServerHead<T extends object>(options: Omit<CreateServerHeadOptions<T>, 'propResolvers'> & { disableDefaults: true }): Unhead<T, SSRHeadPayload>
export function createServerHead<T extends object>(options: Omit<CreateServerHeadOptions<T>, 'propResolvers'>): Unhead<T | ResolvableHead, SSRHeadPayload>
export function createServerHead<T extends object = ResolvableHead>(...args: CreateLegacyServerHeadArgs<T>): Unhead<T, SSRHeadPayload>
export function createServerHead<T extends object = ResolvableHead>(options: Omit<CreateServerHeadOptions<T>, 'propResolvers'> = {}): Unhead<T, SSRHeadPayload> {
  const head = _createServerHead<T>({
    ...options,
    plugins: [...legacyPlugins, ...(options.plugins || [])],
  } as CreateServerHeadOptions<T> & { disableDefaults: true })
  activeHead.value = head
  return head
}

export const createHeadCore = createUnhead
