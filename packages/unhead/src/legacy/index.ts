import type { CreateClientHeadOptions, CreateServerHeadOptions, ResolvableHead, Unhead } from '../types'
import { createHead as _createClientHead } from '../client'
import { AliasSortingPlugin } from '../plugins/aliasSorting'
import { defineHeadPlugin } from '../plugins/defineHeadPlugin'
import { PromisesPlugin } from '../plugins/promises'
import { TemplateParamsPlugin } from '../plugins/templateParams'
import { createHead as _createServerHead } from '../server'
import { createUnhead } from '../unhead'

/**
 * Maps unhead v1 tag props (`children`, `hid`, `vmid`, `body`) to their v3 equivalents
 * (`innerHTML`, `key`, `tagPosition`).
 *
 * Intended as a temporary migration aid. Remove once all call sites use the v3 API.
 */
export const DeprecationsPlugin = /* @__PURE__ */ defineHeadPlugin({
  key: 'deprecations',
  hooks: {
    'entries:normalize': ({ tags }) => {
      for (const tag of tags) {
        if (tag.props.children) {
          tag.innerHTML = tag.props.children
          delete tag.props.children
        }
        if (tag.props.hid) {
          tag.key = tag.props.hid
          delete tag.props.hid
        }
        if (tag.props.vmid) {
          tag.key = tag.props.vmid
          delete tag.props.vmid
        }
        if (tag.props.body) {
          tag.tagPosition = 'bodyClose'
          delete tag.props.body
        }
      }
    },
  },
})

const LEGACY_PLUGINS = [DeprecationsPlugin, PromisesPlugin, TemplateParamsPlugin, AliasSortingPlugin]

export const activeHead: { value: Unhead<any> | null } = { value: null }

export function getActiveHead<T extends Record<string, any> = ResolvableHead>(): Unhead<T> | null {
  return activeHead.value
}

export function createHead<T extends Record<string, any> = ResolvableHead>(options: CreateClientHeadOptions = {}): Unhead<T> {
  return activeHead.value = _createClientHead<T>({
    ...options,
    plugins: [...LEGACY_PLUGINS, ...(options.plugins || [])],
  })
}

export function createServerHead<T extends Record<string, any> = ResolvableHead>(options: Omit<CreateServerHeadOptions, 'propResolvers'> = {}): Unhead<T> {
  return activeHead.value = _createServerHead<T>({
    ...options,
    plugins: [...LEGACY_PLUGINS, ...(options.plugins || [])],
  })
}

export const createHeadCore = createUnhead
