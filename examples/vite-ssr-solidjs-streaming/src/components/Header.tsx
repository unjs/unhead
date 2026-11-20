import { createMemo, Show } from 'solid-js'
import { useHead } from '@unhead/solid-js'

const DATA = { user: 'John Doe', cartCount: 3 }

const fetchData = async () => {
  await new Promise(r => setTimeout(r, 250))
  return DATA
}

export default function Header(props: { showProgress?: boolean }) {
  const data = createMemo(fetchData)

  return (
    <Show when={data()} keyed>
      {data => <HeaderContent data={data} showProgress={props.showProgress} />}
    </Show>
  )
}

function HeaderContent(props: { data: typeof DATA; showProgress?: boolean }) {
  useHead({
    meta: [{ name: 'user-status', content: 'logged-in' }],
    ...(props.showProgress !== false && {
      title: 'StreamShop 1/11 - Loading...',
      style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:9%}' }],
    }),
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
        <span class="cart">🛒 {props.data.cartCount}</span>
        <span class="user">👤 {props.data.user}</span>
      </div>
    </header>
  )
}
