import { use } from 'react'
import { useHead } from '@unhead/react'

const cache = new Map<string, Promise<{ categories: string[] }>>()

export default function Sidebar() {
  const cacheKey = 'sidebar'
  if (!cache.has(cacheKey)) {
    cache.set(cacheKey, new Promise(resolve =>
      setTimeout(() => resolve({
        categories: ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Toys']
      }), 625)
    ))
    cache.get(cacheKey)!.finally(() => setTimeout(() => cache.delete(cacheKey), 100))
  }
  const data = use(cache.get(cacheKey)!)

  useHead({
    title: 'StreamShop 2/11 - Loading...',
    meta: [{ name: 'nav-loaded', content: 'true' }],
    style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:18%}' }],
  })

  return (
    <>
    <script dangerouslySetInnerHTML={{ __html: `window.__streamLog?.('📁 Sidebar', '#a78bfa')` }} />
    <aside className="sidebar">
      <h3>Categories</h3>
      <ul>
        {data.categories.map(cat => (
          <li key={cat}><a href="#">{cat}</a></li>
        ))}
      </ul>
      <div className="filters">
        <h4>Price Range</h4>
        <div className="price-range">$0 - $1000</div>
        <h4>Rating</h4>
        <div className="stars">★★★★☆ & up</div>
      </div>
    </aside>
    </>
  )
}
