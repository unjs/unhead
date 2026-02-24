<script lang="ts">
import { useHead } from '@unhead/svelte'

const DATA = { user: 'John Doe', cartCount: 3 }

const fetchData = async () => {
  await new Promise(r => setTimeout(r, 250))
  return DATA
}

const data = await fetchData()

useHead({
  title: 'StreamShop 1/11 - Loading...',
  meta: [{ name: 'user-status', content: 'logged-in' }],
  style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:9%}' }],
})
</script>

<svelte:boundary>
  <header class="site-header">
    <div class="logo">🛒 StreamShop</div>
    <nav class="nav-links">
      <a href="/">Home</a>
      <a href="/about">About</a>
      <a href="#">Products</a>
      <a href="#">Deals</a>
    </nav>
    <div class="user-area">
      <span class="cart">🛒 {data.cartCount}</span>
      <span class="user">👤 {data.user}</span>
    </div>
  </header>
  {#snippet pending()}
    <header class="site-header skeleton header-skeleton">Loading header...</header>
  {/snippet}
</svelte:boundary>
