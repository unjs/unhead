// Shim for "unhead/utils" while running Nuxt on the v4 adapter.
//
// Nuxt's prefetch-preload-tags.server plugin imports resolveTags from
// "unhead/utils" and calls it with ssrContext.head, which under the alias is a
// v4 head. The adapter ships a v3-shaped resolveTags for exactly that call at
// @unhead/vue/v4/utils; everything else keeps the real utils implementation
// (the v4 adapter itself imports walkResolver from "unhead/utils", which the
// alias also routes here, so the star re-export must stay).
//
// Both imports are file paths on purpose: a bare "unhead/utils" import here
// would hit the alias again and cycle back into this shim.
export * from '../../../packages/unhead/dist/utils.mjs'
export { resolveTags } from '../../../packages/vue/dist/v4/utils.mjs'
