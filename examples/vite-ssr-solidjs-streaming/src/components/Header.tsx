import { createResource } from 'solid-js'
import { useHead } from '@unhead/solid-js'

const DATA = { user: 'John Doe', cartCount: 3 }

const fetchData = async () => {
  await new Promise(r => setTimeout(r, 250))
  return DATA
}

export default function Header() {
  const [data] = createResource(fetchData)

  useHead({
    title: 'StreamShop 1/11 - Loading...',
    meta: [{ name: 'user-status', content: 'logged-in' }],
    style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:9%}' }],
  })

  return (
    <header class="site-header">
      <div class="logo">🛒 StreamShop</div>
      <nav class="nav-links">
        <a href="/">Home</a>
        <a href="/about">About</a>
        <a href="#">Products</a>
        <a href="#">Deals</a>
      </nav>
      <div class="user-area">
        <span class="cart">🛒 {data()?.cartCount}</span>
        <span class="user">👤 {data()?.user}</span>
      </div>
    </header>
  )
}
