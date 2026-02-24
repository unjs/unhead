<script setup lang="ts">
import { Suspense } from 'vue'
import { useHead } from '@unhead/vue'
import { RouterLink } from 'vue-router'
import Header from '../components/Header.vue'
import Sidebar from '../components/Sidebar.vue'
import HeroBanner from '../components/HeroBanner.vue'
import ProductCard from '../components/ProductCard.vue'
import Reviews from '../components/Reviews.vue'
import Newsletter from '../components/Newsletter.vue'

useHead({
  title: 'StreamShop - Vue Streaming SSR Demo',
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

<template>
  <div class="app">
    <div class="stream-progress" />
    <Suspense>
      <template #default>
        <Header />
      </template>
      <template #fallback>
        <div class="skeleton header-skeleton">Loading header...</div>
      </template>
    </Suspense>

    <div class="main-layout">
      <Suspense>
        <template #default>
          <Sidebar />
        </template>
        <template #fallback>
          <div class="skeleton sidebar-skeleton">Loading categories...</div>
        </template>
      </Suspense>

      <main class="content">
        <nav class="page-nav">
          <RouterLink to="/" class="nav-link active">Home</RouterLink>
          <RouterLink to="/about" class="nav-link">About</RouterLink>
        </nav>

        <Suspense>
          <template #default>
            <HeroBanner />
          </template>
          <template #fallback>
            <div class="skeleton hero-skeleton">Loading banner...</div>
          </template>
        </Suspense>

        <section class="products-section">
          <h2>Featured Products</h2>
          <div class="product-grid">
            <Suspense>
              <template #default>
                <ProductCard :id="1" :delay="1375" />
              </template>
              <template #fallback>
                <div class="skeleton product-skeleton">Loading...</div>
              </template>
            </Suspense>
            <Suspense>
              <template #default>
                <ProductCard :id="2" :delay="1500" />
              </template>
              <template #fallback>
                <div class="skeleton product-skeleton">Loading...</div>
              </template>
            </Suspense>
            <Suspense>
              <template #default>
                <ProductCard :id="3" :delay="1625" />
              </template>
              <template #fallback>
                <div class="skeleton product-skeleton">Loading...</div>
              </template>
            </Suspense>
            <Suspense>
              <template #default>
                <ProductCard :id="4" :delay="1750" />
              </template>
              <template #fallback>
                <div class="skeleton product-skeleton">Loading...</div>
              </template>
            </Suspense>
            <Suspense>
              <template #default>
                <ProductCard :id="5" :delay="1875" />
              </template>
              <template #fallback>
                <div class="skeleton product-skeleton">Loading...</div>
              </template>
            </Suspense>
            <Suspense>
              <template #default>
                <ProductCard :id="6" :delay="2000" />
              </template>
              <template #fallback>
                <div class="skeleton product-skeleton">Loading...</div>
              </template>
            </Suspense>
          </div>
        </section>

        <Suspense>
          <template #default>
            <Reviews />
          </template>
          <template #fallback>
            <div class="skeleton reviews-skeleton">Loading reviews...</div>
          </template>
        </Suspense>

        <Suspense>
          <template #default>
            <Newsletter />
          </template>
          <template #fallback>
            <div class="skeleton newsletter-skeleton">Loading newsletter...</div>
          </template>
        </Suspense>
      </main>
    </div>

    <footer class="site-footer">
      <p>2024 StreamShop - Vue Streaming SSR Demo</p>
    </footer>
  </div>
</template>
