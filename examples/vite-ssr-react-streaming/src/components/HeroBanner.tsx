import { use } from 'react'
import { useHead } from '@unhead/react'
import { createSSRCache } from '../utils/cache'

const cache = createSSRCache<{ title: string; subtitle: string; discount: number }>()
const DATA = { title: 'Winter Sale', subtitle: 'Up to 50% off selected items', discount: 50 }

export default function HeroBanner() {
  const data = use(cache.get('hero', DATA, 1000))

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
