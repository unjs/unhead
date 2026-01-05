import { use } from 'react'
import { useHead } from '@unhead/react'
import { createSSRCache } from '../utils/cache'

const cache = createSSRCache<{ subscribers: number; discount: number }>()
const DATA = { subscribers: 50000, discount: 10 }

export default function Newsletter() {
  const data = use(cache.get('newsletter', DATA, 2625))

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
