import { createHead, createHeadCore, createServerHead, createSharedHead } from './createHead'

// create
export {
  createHead,
  createServerHead,
  createHeadCore,
  createSharedHead,
}

// optional plugins
export * from './optionalPlugins/hashHydrationPlugin'
export * from './optionalPlugins/capoPlugin'

// composables
export * from './autoImports'
export * from './composables/injectHead'
export * from './composables/useHead'
export * from './composables/useHeadSafe'
export * from './composables/useServerHead'
export * from './composables/useServerHeadSafe'
export * from './composables/useSeoMeta'
export * from './composables/useServerSeoMeta'
