import { CapoPlugin, HashHydrationPlugin, createHeadCore, setHeadInjectionHandler } from 'unhead'
import { createHead, createServerHead } from './createHead'
import { resolveUnrefHeadInput } from './utils'

// create
export {
  createHead,
  createServerHead,
  createHeadCore,
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

// types
export * from './types'

// composables
export * from './autoImports'
export * from './composables/injectHead'
export * from './composables/useHead'
export * from './composables/useHeadSafe'
export * from './composables/useSeoMeta'
export * from './composables/useServerHead'
export * from './composables/useServerHeadSafe'
export * from './composables/useServerSeoMeta'
export { setHeadInjectionHandler }

export type { HeadTag, MergeHead, ActiveHeadEntry, Head, Unhead, HeadEntryOptions } from '@unhead/schema'
