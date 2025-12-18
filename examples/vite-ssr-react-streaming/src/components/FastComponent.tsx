import { use } from 'react'
import { useHead } from '@unhead/react'

// Fast async component - resolves in 500ms
const cache = new Map<string, Promise<{ category: string }>>()

export default function FastComponent() {
  const cacheKey = 'fast'
  if (!cache.has(cacheKey)) {
    cache.set(cacheKey, new Promise(resolve =>
      setTimeout(() => resolve({ category: 'Electronics' }), 500)
    ))
    cache.get(cacheKey)!.finally(() => setTimeout(() => cache.delete(cacheKey), 100))
  }
  const data = use(cache.get(cacheKey)!)

  useHead({
    meta: [
      { name: 'category', content: data.category },
      { property: 'product:category', content: data.category },
    ],
    link: [
      { rel: 'preload', href: '/fonts/inter.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
    ],
  })

  return (
    <div className="fast-component">
      <span>Category: {data.category}</span>
    </div>
  )
}
