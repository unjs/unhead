import { useHead } from '@unhead/solid-js'

export default function Header() {
  const data = { user: 'John Doe', cartCount: 3 }

  useHead({
    title: 'StreamShop 1/11 - Loading...',
    meta: [{ name: 'user-status', content: 'logged-in' }],
    style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:9%}' }],
  })

  return (
    <header class="site-header">
      <div class="logo">StreamShop</div>
      <nav class="nav-links">
        <a href="/">Home</a>
        <a href="/about">About</a>
        <a href="#">Products</a>
        <a href="#">Deals</a>
      </nav>
      <div class="user-area">
        <span class="cart">Cart ({data.cartCount})</span>
        <span class="user">{data.user}</span>
      </div>
    </header>
  )
}
