import { createHeadCore } from 'unhead'

// composables
export { unheadVueComposablesImports } from './autoImports'

// core
export {
  createHeadCore,
}
export { injectHead, useHead, useHeadSafe, useSeoMeta, useServerHead, useServerHeadSafe, useServerSeoMeta } from './composables'

export {
  headSymbol,
} from './install'
// types
export type * from './types'
export { resolveUnrefHeadInput } from './utils'
export { VueHeadMixin } from './VueHeadMixin'
