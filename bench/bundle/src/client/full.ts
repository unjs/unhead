import { useHead, useScript, useSeoMeta } from 'unhead'
import { createHead } from 'unhead/client'

// Full usage: head + SEO meta + a loaded script. Catches growth in useSeoMeta /
// useScript / plugins that the useHead-only minimal entry tree-shakes away.
const head = createHead()

useHead(head, {
  title: 'Test',
  titleTemplate: '%s | Site',
  meta: [
    { name: 'description', content: 'Test' },
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' },
  ],
})

useSeoMeta(head, {
  title: 'Test',
  description: 'Test description',
  ogTitle: 'Test',
  ogDescription: 'Test description',
  ogImage: '/og.png',
  twitterCard: 'summary_large_image',
})

useScript({ src: '/analytics.js' }, { head })
