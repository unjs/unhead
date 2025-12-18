import { use } from 'react'
import { useHead } from '@unhead/react'

// Component testing SEO meta tags
const cache = new Map<string, Promise<{ slug: string; author: string }>>()

export default function SeoComponent() {
  const cacheKey = 'seo'
  if (!cache.has(cacheKey)) {
    cache.set(cacheKey, new Promise(resolve =>
      setTimeout(() => resolve({
        slug: 'async-product-page',
        author: 'Jane Developer',
      }), 1200)
    ))
    cache.get(cacheKey)!.finally(() => setTimeout(() => cache.delete(cacheKey), 100))
  }
  const data = use(cache.get(cacheKey)!)

  useHead({
    link: [
      { rel: 'canonical', href: `https://example.com/${data.slug}` },
      { rel: 'alternate', hreflang: 'es', href: `https://example.com/es/${data.slug}` },
      { rel: 'alternate', hreflang: 'fr', href: `https://example.com/fr/${data.slug}` },
    ],
    meta: [
      { name: 'robots', content: 'index, follow, max-image-preview:large' },
      { name: 'author', content: data.author },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:site', content: '@example' },
      { name: 'twitter:creator', content: '@janedeveloper' },
      { name: 'twitter:title', content: 'Async Product Page' },
      { name: 'twitter:description', content: 'A product loaded via streaming SSR' },
      { name: 'twitter:image', content: 'https://example.com/images/product.jpg' },
    ],
  })

  return (
    <div className="seo-component">
      <p>SEO data loaded for: {data.slug}</p>
      <p>Author: {data.author}</p>
    </div>
  )
}
