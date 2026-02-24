import { use } from 'react'
import { useHead } from '@unhead/react'
import { createSSRCache } from '../utils/cache'

const cache = createSSRCache<{ user: string; cartCount: number }>()
const DATA = { user: 'John Doe', cartCount: 3 }

export default function Header() {
  const data = use(cache.get('header', DATA, 250))

  useHead({
    title: 'StreamShop 1/11 - Loading...',
    meta: [{ name: 'user-status', content: 'logged-in' }],
    style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:9%}' }],
  })

  return (
    <>
    <script dangerouslySetInnerHTML={{ __html: `window.__streamLog?.('🔷 Header', '#60a5fa')` }} />
    <header className="site-header">
      <div className="logo">🛒 StreamShop</div>
      <nav className="nav-links">
        <a href="#">Home</a>
        <a href="#">Products</a>
        <a href="#">Categories</a>
        <a href="#">Deals</a>
      </nav>
      <div className="user-area">
        <span className="cart">🛒 {data.cartCount}</span>
        <span className="user">👤 {data.user}</span>
      </div>
    </header>
    </>
  )
}
