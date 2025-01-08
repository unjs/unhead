import { unheadCtx } from 'unhead'
import { resolveUnrefHeadInput } from './utils'

// create
export {
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
export * from './composables/useScript'
export * from './composables/useSeoMeta'
export * from './composables/useServerHead'
export * from './composables/useServerHeadSafe'
export * from './composables/useServerSeoMeta'
// types
export * from './types'
export * from './VueHeadMixin'

export type { ActiveHeadEntry, Head, HeadEntryOptions, HeadTag, MergeHead, Unhead } from '@unhead/schema'
