// Nuxt 4.5.2 + Vite 8 issue: `nuxt:client-manifest`'s closeBundle runs twice
// for the ssr environment when the unhead transform pipeline is active. The
// hook reads and then DELETES dist/client/manifest.json, so the second run
// throws NUXT_B7021 and fails the whole build. Wrap it to run once.
// TODO: remove once fixed upstream (nuxt/nuxt).
function makeClientManifestCloseBundleIdempotent(plugins: any[]) {
  for (const p of plugins) {
    if (p?.name === 'nuxt:client-manifest' && p.closeBundle && !p.__unheadIdempotent) {
      p.__unheadIdempotent = true
      const orig = p.closeBundle
      let ran = false
      p.closeBundle = async function (this: any, ...args: any[]) {
        if (ran)
          return
        ran = true
        return orig.apply(this, args)
      }
    }
  }
}

export default defineNuxtConfig({
  future: { compatibilityVersion: 5 },
  unhead: {
    vite: {
      // Compiled mode: static head calls imported from @unhead/vue/precompiled
      // become build-time render plans. Nuxt must resolve the workspace
      // @unhead/vue (see the nuxt>@unhead/vue override in pnpm-workspace.yaml).
      experimental: { precompile: true },
    },
  },
  hooks: {
    'vite:extendConfig'(config) {
      makeClientManifestCloseBundleIdempotent(config.plugins || [])
    },
  },
})
