import { useSeoMeta } from '@unhead/vue'
import { createHead } from '@unhead/vue/client'

// Realistic SEO usage — what most apps actually write.
const head = createHead()

useSeoMeta({
  title: 'Test',
  titleTemplate: '%s | Site',
  description: 'Test description',
  ogTitle: 'Test',
  ogDescription: 'Test description',
  ogImage: '/og.png',
  ogType: 'website',
  ogSiteName: 'Site',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Test',
  twitterDescription: 'Test description',
  twitterImage: '/og.png',
}, {
  head,
})
