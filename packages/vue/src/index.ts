import { defineHeadPlugin } from '@unhead/shared'
import { createHeadCore, unheadCtx } from 'unhead'
import { resolveUnrefHeadInput } from './utils'

/**
 * @deprecated TODO remove
 */
export const CapoPlugin = () => defineHeadPlugin({})

// core
export {
  createHeadCore,
  unheadCtx,
}

// utils
export {
  resolveUnrefHeadInput,
}

// composables
export * from './autoImports'
export * from './composables/injectHead'
export * from './composables/useHead'

export * from './composables/useHeadSafe'
export * from './composables/useSeoMeta'
export * from './composables/useServerHead'
export * from './composables/useServerHeadSafe'
export * from './composables/useServerSeoMeta'
// types
export * from './types'
export * from './VueHeadMixin'

export type { ActiveHeadEntry, Head, HeadEntryOptions, HeadTag, MergeHead, Unhead } from '@unhead/schema'
