// Measurement-only harness (see bench/measure-runtime-omission.mjs). Models
// what /about's client bundle WOULD contain if route-head-manifest.json's
// runtimeOmittable:true verdict were wired into the build: the SSR payload
// is already baked into the HTML, no useSeoMeta/useHead composable runs on
// the client, and the entire @unhead/vue import graph is gone. This is the
// bundle-size half of the sidestep's payoff; the enforcement half (proving
// no client-only useHead exists on the route) is scan-client-only-head.ts.
import { createApp } from 'vue'

const app = createApp({
  setup() {
    return () => null
  },
})
app.mount('#app')
