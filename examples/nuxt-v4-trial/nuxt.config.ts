export default defineNuxtConfig({
  future: { compatibilityVersion: 5 },
  modules: ['./modules/sealed-head'],
  unhead: {
    vite: {
      // Compiled mode: static head calls imported from @unhead/vue/precompiled
      // become build-time render plans. Nuxt must resolve the workspace
      // @unhead/vue (see the nuxt>@unhead/vue override in pnpm-workspace.yaml).
      experimental: { precompile: true },
    },
  },
})
