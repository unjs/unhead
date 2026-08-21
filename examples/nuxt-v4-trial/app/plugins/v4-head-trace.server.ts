// Server-only (`.server` suffix). Captures the V4Head instance's registered
// state right after Nuxt finishes rendering the Vue app for this request and
// relays it to the Nitro side (server/plugins/v4-head-manifest.ts) through
// the process-local registry in ../../module/head-trace-registry. This is
// the "record registered head plans during prerender" half of the sidestep;
// the double-render and manifest emission happen entirely in Nitro, which
// drives the prerender lifecycle and can trigger the second render itself.
import type { V4Head } from 'unhead/v4'
import { recordRouteHead } from 'unhead/v4/record'
// This file (Vite-bundled with the Vue app) and the Nitro plugin (Rollup-
// bundled separately) each get their OWN compiled copy of this import; state
// sharing works via globalThis inside head-trace-registry.ts, not via module
// identity. See that file's doc comment for the measured failure mode.
import { pushAttempt } from '../../module/head-trace-registry'

export default defineNuxtPlugin({
  name: 'v4-head-trace',
  enforce: 'post',
  setup(nuxtApp) {
    nuxtApp.hooks.hook('app:rendered', () => {
      const ssrContext = nuxtApp.ssrContext
      if (!ssrContext)
        return
      const recorded = recordRouteHead(ssrContext.head as unknown as V4Head)
      pushAttempt(ssrContext.event.path, recorded)
    })
  },
})
