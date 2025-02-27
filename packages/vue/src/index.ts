import { createUnhead } from 'unhead'

export { unheadVueComposablesImports } from './autoImports'
export { injectHead, useHead, useHeadSafe, useScript, useSeoMeta, useServerHead, useServerHeadSafe, useServerSeoMeta } from './composables'
export { headSymbol } from './install'
export type * from './types'
export { resolveUnrefHeadInput } from './utils'
export { VueHeadMixin } from './VueHeadMixin'
/**
 * @deprecated Use createUnhead
 */
const createCoreHead = createUnhead
export { createCoreHead, createUnhead }
