import { use } from 'react'
import { useHead } from '@unhead/react'
import { createSSRCache } from '../utils/cache'

const cache = createSSRCache<{ categories: string[] }>()
const DATA = { categories: ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Toys'] }

export default function Sidebar() {
  const data = use(cache.get('sidebar', DATA, 625))

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
