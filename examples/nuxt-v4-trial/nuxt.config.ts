import { fileURLToPath } from 'node:url'
import { addTemplate, defineNuxtModule } from 'nuxt/kit'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Map every @unhead/vue surface Nuxt imports onto the v4 adapter dist.
// Order matters: rollup-style aliases match `find` exactly or as a prefix
// followed by "/", so every subpath Nuxt touches gets an explicit entry
// BEFORE the bare "@unhead/vue" key (a bare key with a file replacement
// would otherwise poison deeper subpaths like /stream/server).
//
// stream/* and scripts stay on the current (v3) build: the nitro renderer
// imports them at module top level even when streaming is disabled, and v4
// ships no streaming surface yet.
const unheadV4Alias = {
  '@unhead/vue/stream/server': r('../../packages/vue/dist/stream/server.mjs'),
  '@unhead/vue/stream/client': r('../../packages/vue/dist/stream/client.mjs'),
  '@unhead/vue/stream/iife': r('../../packages/vue/dist/stream/iife.mjs'),
  '@unhead/vue/scripts': r('../../packages/vue/dist/scripts.mjs'),
  '@unhead/vue/types': r('../../packages/vue/dist/types.mjs'),
  '@unhead/vue/legacy': r('../../packages/vue/dist/legacy.mjs'),
  '@unhead/vue/client': r('../../packages/vue/dist/v4/client.mjs'),
  '@unhead/vue/server': r('../../packages/vue/dist/v4/server.mjs'),
  '@unhead/vue/plugins': r('../../packages/vue/dist/v4/plugins.mjs'),
  '@unhead/vue/utils': r('../../packages/vue/dist/v4/utils.mjs'),
  '@unhead/vue': r('../../packages/vue/dist/v4.mjs'),
  // Nuxt's prefetch-preload-tags.server plugin calls resolveTags(head) from
  // "unhead/utils"; the shim keeps the real utils surface but swaps in the
  // v4-shaped resolveTags from the adapter.
  'unhead/utils': r('./shims/unhead-utils.mjs'),
}

// Nuxt's own unhead-options.mjs template imports legacyPlugins from an
// ABSOLUTE resolved path into @unhead/vue/dist/legacy.mjs (compatibilityVersion
// 4), which no alias key can reliably match. Re-emitting the template after all
// modules ran replaces it with a bare-specifier import that the alias rewrites
// to the v4 plugins entry.
const UnheadV4Options = defineNuxtModule({
  meta: { name: 'unhead-v4-options' },
  setup(_, nuxt) {
    nuxt.hooks.hook('modules:done', () => {
      addTemplate({
        filename: 'unhead-options.mjs',
        getContents: () => [
          'import { TemplateParamsPlugin } from \'@unhead/vue/plugins\'',
          'export default {',
          '  disableDefaults: true,',
          '  plugins: [TemplateParamsPlugin],',
          '}',
        ].join('\n'),
      })
    })
  },
})

// UNHEAD_V3_BASELINE=1 nuxt build: skip the override entirely, for A/B
// comparison of SSR output and bundle size against stock v3.
const baseline = !!process.env.UNHEAD_V3_BASELINE

export default defineNuxtConfig({
  compatibilityDate: '2026-08-01',
  modules: baseline ? [] : [UnheadV4Options],
  // nuxt.options.alias flows into BOTH the vite builds (client + server app
  // bundle) and nitro's rollup build (the renderer that calls createHead and
  // renderSSRHead), so one map covers every consumer.
  alias: baseline ? {} : unheadV4Alias,
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      titleTemplate: '%s · v4 trial',
      meta: [
        { name: 'theme-color', content: '#111111' },
      ],
    },
  },
})
