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
