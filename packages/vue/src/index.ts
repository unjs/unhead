import { CapoPlugin, createHeadCore, HashHydrationPlugin, unheadCtx } from 'unhead'
import { createHead, createServerHead } from './createHead'
import { resolveUnrefHeadInput } from './utils'

// create
export {
  createHead,
  createHeadCore,
  createServerHead,
  unheadCtx,
}

// extra plugins
export {
  CapoPlugin,
  HashHydrationPlugin,
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
export * from './Vue2ProvideUnheadPlugin'
// vue 2
export * from './VueHeadMixin'

export type { ActiveHeadEntry, Head, HeadEntryOptions, HeadTag, MergeHead, Unhead } from '@unhead/schema'
