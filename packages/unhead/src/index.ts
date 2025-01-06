import { createHead, createHeadCore, createServerHead } from './createHead'

// create
export {
  createHead,
  createHeadCore,
  createServerHead,
}

// composables
export * from './autoImports'

export * from './composables/useHead'
export * from './composables/useHeadSafe'
export * from './composables/useScript'
export * from './composables/useSeoMeta'
export * from './composables/useServerHead'
export * from './composables/useServerHeadSafe'
export * from './composables/useServerSeoMeta'
export * from './optionalPlugins/capoPlugin'
// optional plugins
export * from './optionalPlugins/hashHydrationPlugin'
