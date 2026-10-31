import { defineNuxtModule, addPluginTemplate } from '@nuxt/kit'

/**
 * Prototype bridge for compiled mode inside Nuxt.
 *
 * Nuxt creates and owns its head instance from the normal `@unhead/vue`
 * runtime, so sealed plans cannot attach to it. This module runs a SECOND,
 * sealed head alongside Nuxt's:
 *
 * - a universal plugin creates the sealed head per environment (the neutral
 *   `@unhead/vue/precompiled` import is rewritten per build target) and
 *   provides it as `nuxtApp.$sealedHead`
 * - pages pass it explicitly: `useSeoMeta({ ... }, { head })`
 * - on the server, `nitro/sealed-head.ts` merges the sealed payload into the
 *   response through the `render:html` hook (per-request, keyed by the h3
 *   event via a WeakMap)
 * - on the client, the eager sealed head renders on push and adopts the
 *   SSR-rendered tags by identity
 *
 * Full compiled mode in Nuxt would productize this inside `@unhead/nuxt`.
 */
export default defineNuxtModule({
  meta: { name: 'sealed-head' },
  setup(_options, nuxt) {
    // Client: the sealed framework createHead accepts no options.
    addPluginTemplate({
      filename: 'sealed-head/client.mjs',
      mode: 'client',
      getContents: () => [
        `import { createHead } from '@unhead/vue/precompiled'`,
        `export default defineNuxtPlugin((nuxtApp) => {`,
        `  nuxtApp.provide('sealedHead', createHead())`,
        `})`,
      ].join('\n'),
    })
    // Server: disable defaults, Nuxt owns the default tags through its own head.
    addPluginTemplate({
      filename: 'sealed-head/server.mjs',
      mode: 'server',
      getContents: () => [
        `import { createHead } from '@unhead/vue/precompiled'`,
        `export default defineNuxtPlugin((nuxtApp) => {`,
        `  const head = createHead({ disableDefaults: true })`,
        `  nuxtApp.provide('sealedHead', head)`,
        `  globalThis.__unheadSealedHeads ||= new WeakMap()`,
        `  globalThis.__unheadSealedHeads.set(nuxtApp.ssrContext.event, head)`,
        `})`,
      ].join('\n'),
    })
  },
})
