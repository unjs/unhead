import { createHead, renderSSRHead, useHead, useSeoMeta } from 'unhead/precompiled/server'

export function renderStaticHead() {
  const head = createHead({ disableDefaults: true })
  useHead({
    htmlAttrs: { lang: 'en-AU', dir: 'ltr' },
    bodyAttrs: { 'data-page': 'product' },
    title: 'Widget Pro | Example Store',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
  }, { head })
  useSeoMeta({
    description: 'A realistic static product page used to measure precompiled head runtime work.',
    ogTitle: 'Widget Pro',
    ogDescription: 'A realistic static product page used to measure precompiled head runtime work.',
    ogImage: 'https://example.com/products/widget-pro/og.png',
    ogImageAlt: 'Widget Pro on a studio background',
    ogType: 'website',
    ogSiteName: 'Example Store',
    twitterCard: 'summary_large_image',
    twitterTitle: 'Widget Pro',
    twitterDescription: 'A realistic static product page used to measure precompiled head runtime work.',
    twitterImage: 'https://example.com/products/widget-pro/og.png',
  }, { head })
  useHead({
    link: [
      { rel: 'canonical', href: 'https://example.com/products/widget-pro' },
      { rel: 'preload', as: 'image', href: '/products/widget-pro/hero.webp', fetchpriority: 'high' },
      { rel: 'preconnect', href: 'https://cdn.example.com', crossorigin: 'anonymous' },
      { rel: 'stylesheet', href: '/assets/product.css' },
    ],
    meta: [
      { name: 'robots', content: 'index, follow' },
      { name: 'theme-color', content: '#ffffff' },
      { property: 'product:price:amount', content: '129.99' },
      { property: 'product:price:currency', content: 'AUD' },
    ],
    script: [
      { src: '/assets/product.js', defer: true },
      {
        type: 'application/ld+json',
        innerHTML: {
          '@context': 'https://schema.org',
          '@type': 'Product',
          'name': 'Widget Pro',
          'sku': 'WIDGET-PRO-001',
          'offers': {
            '@type': 'Offer',
            'availability': 'https://schema.org/InStock',
            'price': '129.99',
            'priceCurrency': 'AUD',
          },
        },
      },
    ],
    style: [{ textContent: '.product-hero{content-visibility:auto}' }],
  }, { head })
  return renderSSRHead(head)
}
