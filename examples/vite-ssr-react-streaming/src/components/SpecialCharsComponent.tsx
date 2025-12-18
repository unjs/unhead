import { use } from 'react'
import { useHead } from '@unhead/react'

// Component testing unicode, special chars, and structured data
const cache = new Map<string, Promise<{ name: string; price: number }>>()

export default function SpecialCharsComponent() {
  const cacheKey = 'special'
  if (!cache.has(cacheKey)) {
    cache.set(cacheKey, new Promise(resolve =>
      setTimeout(() => resolve({
        name: 'Café ☕ & Résumé — "Special" <Product>',
        price: 29.99,
      }), 1000)
    ))
    cache.get(cacheKey)!.finally(() => setTimeout(() => cache.delete(cacheKey), 100))
  }
  const data = use(cache.get(cacheKey)!)

  useHead({
    title: data.name,
    meta: [
      { name: 'special-chars', content: 'Test: <script>alert("xss")</script> & "quotes" \' apostrophe' },
      { name: 'unicode', content: '日本語 中文 한국어 🚀 emoji' },
      { property: 'og:price:amount', content: String(data.price) },
      { property: 'og:price:currency', content: 'USD' },
    ],
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          'name': data.name,
          'offers': {
            '@type': 'Offer',
            'price': data.price,
            'priceCurrency': 'USD',
          },
        }),
      },
    ],
  })

  return (
    <div className="special-chars-component">
      <h3>{data.name}</h3>
      <p>Price: ${data.price}</p>
    </div>
  )
}
