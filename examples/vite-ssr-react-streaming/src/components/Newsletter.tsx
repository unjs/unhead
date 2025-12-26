import { use } from 'react'
import { useHead } from '@unhead/react'

const cache = new Map<string, Promise<{ subscribers: number; discount: number }>>()

export default function Newsletter() {
  const cacheKey = 'newsletter'
  if (!cache.has(cacheKey)) {
    const delay = typeof window === 'undefined' ? 2625 : 0
    cache.set(cacheKey, new Promise(resolve =>
      setTimeout(() => resolve({ subscribers: 50000, discount: 10 }), delay)
    ))
    cache.get(cacheKey)!.finally(() => setTimeout(() => cache.delete(cacheKey), 100))
  }
  const data = use(cache.get(cacheKey)!)

  useHead({
    title: 'StreamShop - Ready!',
    meta: [{ name: 'newsletter-status', content: 'loaded' }],
    style: [{ key: 'progress', innerHTML: '.stream-progress{opacity:0;transition:opacity 0.3s}' }],
  })

  return (
    <>
    <script dangerouslySetInnerHTML={{ __html: `window.__streamLog?.('📧 Newsletter', '#22d3ee')` }} />
    <div className="newsletter">
      <h3>📧 Join Our Newsletter</h3>
      <p>Get {data.discount}% off your first order! Join {data.subscribers.toLocaleString()}+ subscribers.</p>
      <div className="newsletter-form">
        <input type="email" placeholder="Enter your email" />
        <button>Subscribe</button>
      </div>
    </div>
    </>
  )
}
