<script lang="ts">
import { useHead } from '@unhead/svelte'
import Header from '../components/Header.svelte'
import Sidebar from '../components/Sidebar.svelte'
import HeroBanner from '../components/HeroBanner.svelte'
import ProductCard from '../components/ProductCard.svelte'
import Reviews from '../components/Reviews.svelte'
import Newsletter from '../components/Newsletter.svelte'

useHead({
  title: 'StreamShop - Svelte Streaming SSR Demo',
  htmlAttrs: { lang: 'en' },
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'description', content: 'E-commerce demo with streaming SSR' },
    { name: 'page-id', content: 'home' },
  ],
  link: [{ rel: 'canonical', href: 'https://example.com/' }],
})
</script>

<div class="app">
  <div class="stream-progress"></div>
  <Header />

  <div class="main-layout">
    <Sidebar />

    <main class="content">
      <nav class="page-nav">
        <a href="/" class="nav-link active">Home</a>
        <a href="/about" class="nav-link">About</a>
      </nav>

      <HeroBanner />

      <section class="products-section">
        <h2>Featured Products</h2>
        <div class="product-grid">
          <ProductCard id={1} delay={1375} />
          <ProductCard id={2} delay={1500} />
          <ProductCard id={3} delay={1625} />
          <ProductCard id={4} delay={1750} />
          <ProductCard id={5} delay={1875} />
          <ProductCard id={6} delay={2000} />
        </div>
      </section>

      <Reviews />
      <Newsletter />
    </main>
  </div>

  <footer class="site-footer">
    <p>2024 StreamShop - Svelte Streaming SSR Demo</p>
  </footer>
</div>
