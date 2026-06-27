import { useHead, useScript, useSeoMeta } from '@unhead/react'
import { createHead, UnheadProvider } from '@unhead/react/client'

// Full client usage: head + SEO meta + a loaded script via the provider. Catches
// growth in useSeoMeta / useScript the useHead-only minimal entry tree-shakes away.
export const head = createHead()

export function App() {
  useHead({
    title: 'Test',
    titleTemplate: '%s | Site',
    meta: [
      { name: 'description', content: 'Test' },
    ],
    link: [
      { rel: 'icon', href: '/favicon.ico' },
    ],
  })

  useSeoMeta({
    title: 'Test',
    description: 'Test description',
    ogTitle: 'Test',
    ogDescription: 'Test description',
    ogImage: '/og.png',
    twitterCard: 'summary_large_image',
  })

  useScript({ src: '/analytics.js' })

  return UnheadProvider
}
