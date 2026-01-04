import { createHead, renderSSRHead } from 'unhead/server'
import { bench, describe } from 'vitest'
import { useSeoMeta } from '../packages/unhead/src'

describe('use seo meta', () => {
  bench('x50 ssr', async () => {
    const head = createHead()
    const page = {
      title: 'Home',
      description: 'Home page description',
      image: 'https://nuxtjs.org/meta_0.png',
    }
    for (const i in Array.from({ length: 1000 })) {
      useSeoMeta(head, {
        // de-dupe keys
        title: `${page.title}-${i} | Nuxt`,
        description: `${page.description} ${i}`,
        ogImage: `${page.image}?${i}`,
        ogImageAlt: `${page.image}?${i}`,
        ogSiteName: 'Nuxt',
        ogType: 'website',
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
