/** @experimental v4 preview surface: semver-exempt until v4 stabilizes. See packages/unhead/V4_DESIGN.md. */
export { unheadVueComposablesImports } from '../autoImports'
export {
  injectHead,
  useHead,
  useHeadSafe,
  useSeoMeta,
  useServerHead,
  useServerHeadSafe,
  useServerSeoMeta,
} from './composables'
export { headSymbol } from './install'
export { sanitizeSafeInput } from './safe'
export type * from './types'
export { resolveUnrefHeadInput } from './utils'
export { defineLink, defineScript } from 'unhead'
