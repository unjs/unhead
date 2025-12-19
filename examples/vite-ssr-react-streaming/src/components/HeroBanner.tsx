import { use } from 'react'
import { useHead } from '@unhead/react'

const cache = new Map<string, Promise<{ title: string; subtitle: string; discount: number }>>()

export default function HeroBanner() {
  const cacheKey = 'hero'
  if (!cache.has(cacheKey)) {
    cache.set(cacheKey, new Promise(resolve =>
      setTimeout(() => resolve({
        title: 'Winter Sale',
        subtitle: 'Up to 50% off selected items',
        discount: 50
      }), 1000)
    ))
    cache.get(cacheKey)!.finally(() => setTimeout(() => cache.delete(cacheKey), 100))
  }
  const data = use(cache.get(cacheKey)!)

  useHead({
    title: 'StreamShop 3/11 - Loading...',
    meta: [
      { property: 'og:title', content: `${data.title} - ${data.discount}% Off` },
    ],
    style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:27%}' }],
  })

  return (
    <>
    <script dangerouslySetInnerHTML={{ __html: `window.__streamLog?.('🎯 Hero Banner', '#f472b6')` }} />
    <div className="hero-banner">
      <h1>{data.title}</h1>
      <p>{data.subtitle}</p>
      <button className="cta-button">Shop Now →</button>
    </div>
    </>
  )
}
