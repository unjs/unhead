import { use } from 'react'
import { useHead } from '@unhead/react'

type ProductData = { title: string; description: string }

// Factory to create fresh promise - simulate API call
function fetchData(): Promise<ProductData> {
  return new Promise(resolve =>
    setTimeout(() => resolve({
      title: 'Async Product - $99',
      description: 'This product loaded after a delay with streaming SSR',
    }), 2000),
  )
}

// React 19 cache pattern - cache the promise by a stable key per component tree
// This ensures the same promise is used during a single render cycle
const cache = new Map<string, Promise<ProductData>>()

export default function SlowComponent() {
  // Use a cache key that resets when module is reloaded (for HMR/SSR)
  const cacheKey = 'product'
  if (!cache.has(cacheKey)) {
    cache.set(cacheKey, fetchData())
    // Clear cache after promise settles so next SSR request gets fresh data
    cache.get(cacheKey)!.finally(() => setTimeout(() => cache.delete(cacheKey), 100))
  }
  const data = use(cache.get(cacheKey)!)

  // Update head with async data - the Vite plugin handles streaming automatically
  useHead({
    title: data.title,
    meta: [
      { name: 'description', content: data.description },
      { property: 'og:title', content: data.title },
      { property: 'og:description', content: data.description },
    ],
    link: [
      { rel: 'stylesheet', href: 'https://example.com/product-styles.css' },
    ],
  })

  return (
    <div className="slow-component">
      <h2>{data.title}</h2>
      <p>{data.description}</p>
    </div>
  )
}
