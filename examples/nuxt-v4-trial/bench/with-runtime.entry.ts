// Measurement-only harness (see bench/measure-runtime-omission.mjs). Models
// what /about's client bundle contains TODAY: the v4 head runtime boots and
// the page's useSeoMeta/useHead calls re-run on hydration, even though
// route-head-manifest.json already proved this route's payload is
// deterministic and needs no client mutation. Not a working app: no DOM,
// no #app element, never executed, only bundled and gzipped for byte count.
import { createHead } from '@unhead/vue/v4/client'
import { useHead, useSeoMeta } from '@unhead/vue/v4'
import { createApp } from 'vue'

const head = createHead()
const app = createApp({
  setup() {
    useSeoMeta({
      title: 'About',
      description: 'Nuxt on unhead v4: about page',
      ogTitle: 'About the v4 trial',
    })
    useHead({
      link: [{ rel: 'canonical', href: 'https://example.com/about' }],
    })
    return () => null
  },
})
app.use(head)
app.mount('#app')
