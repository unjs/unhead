import { useHead, useSeoMeta } from '@unhead/vue/precompiled'

// An MPA client keeps application code but erases its server-owned head calls.
// The built output must be byte-identical to precompile-none-control.ts.
export const page = 'static-product-page'

useHead({
  htmlAttrs: { lang: 'en-AU', dir: 'ltr' },
  bodyAttrs: { 'data-page': 'product' },
  title: 'Widget Pro | Example Store',
})

useSeoMeta({
  description: 'A realistic static product page used to measure precompiled head runtime work.',
  ogTitle: 'Widget Pro',
  ogImage: 'https://example.com/products/widget-pro/og.png',
  twitterCard: 'summary_large_image',
})
