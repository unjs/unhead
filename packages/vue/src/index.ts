import { defineHeadPlugin } from '@unhead/shared'
import { createHeadCore } from 'unhead'
import { resolveUnrefHeadInput } from './utils'

/**
 * @deprecated TODO remove
 */
export const CapoPlugin = () => defineHeadPlugin({})

// core
export {
  createHeadCore,
}

// utils
export {
  resolveUnrefHeadInput,
}

// composables
export * from './autoImports'
export * from './composables'
// types
export * from './types'
export * from './VueHeadMixin'

export type { ActiveHeadEntry, Head, HeadEntryOptions, HeadTag, MergeHead, Unhead } from '@unhead/schema'
