// Hand-written equivalent of what the unified Vite plugin's `UseSeoMetaTransform`
// emits when it rewrites `useSeoMeta({...})` into raw `useHead({ meta: [...] })`.
// Compare against `use-seo-meta-perf.bench.ts` to see the runtime win from the
// build-time transform.
import { createHead, renderSSRHead } from 'unhead/server'
import { bench, describe } from 'vitest'
import { useHead } from '../packages/unhead/src'

describe('use seo meta (vite plugin transformed)', () => {
  bench('x50 ssr', async () => {
    const head = createHead()
    const page = {
      title: 'Home',
      description: 'Home page description',
      image: 'https://nuxtjs.org/meta_0.png',
    }
    for (const i in Array.from({ length: 1000 })) {
      useHead(head, {
        title: `${page.title}-${i} | Nuxt`,
        meta: [
          { name: 'description', content: `${page.description} ${i}` },
          { property: 'og:image', content: `${page.image}?${i}` },
          { property: 'og:image:alt', content: `${page.image}?${i}` },
          { property: 'og:site_name', content: 'Nuxt' },
          { property: 'og:type', content: 'website' },
        ],
      }, {
        head,
      })
    }
    renderSSRHead(head)
  }, {
    iterations: 1000,
    time: 1000,
  })
})
