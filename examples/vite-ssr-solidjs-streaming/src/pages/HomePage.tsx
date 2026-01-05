import { Suspense } from 'solid-js'
import { useHead } from '@unhead/solid-js'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import HeroBanner from '../components/HeroBanner'
import ProductCard from '../components/ProductCard'
import Reviews from '../components/Reviews'
import Newsletter from '../components/Newsletter'

export default function HomePage() {
  useHead({
    title: 'StreamShop - SolidJS Streaming SSR Demo',
    htmlAttrs: { lang: 'en' },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'description', content: 'E-commerce demo with streaming SSR' },
      { name: 'page-id', content: 'home' },
    ],
    link: [{ rel: 'canonical', href: 'https://example.com/' }],
  })

  return (
    <>
      <Suspense fallback={<div class="skeleton header-skeleton">Loading header...</div>}>
        <Header />
      </Suspense>
      <div class="main-layout">
        <Suspense fallback={<div class="skeleton sidebar-skeleton">Loading categories...</div>}>
          <Sidebar />
        </Suspense>
        <main class="content">
          <Suspense fallback={<div class="skeleton hero-skeleton">Loading banner...</div>}>
            <HeroBanner />
          </Suspense>
          <section class="products-section">
            <h2>Featured Products</h2>
            <div class="product-grid">
              <Suspense fallback={<div class="skeleton product-skeleton">Loading...</div>}>
                <ProductCard id={1} delay={1375} />
              </Suspense>
              <Suspense fallback={<div class="skeleton product-skeleton">Loading...</div>}>
                <ProductCard id={2} delay={1500} />
              </Suspense>
              <Suspense fallback={<div class="skeleton product-skeleton">Loading...</div>}>
                <ProductCard id={3} delay={1625} />
              </Suspense>
              <Suspense fallback={<div class="skeleton product-skeleton">Loading...</div>}>
                <ProductCard id={4} delay={1750} />
              </Suspense>
              <Suspense fallback={<div class="skeleton product-skeleton">Loading...</div>}>
                <ProductCard id={5} delay={1875} />
              </Suspense>
              <Suspense fallback={<div class="skeleton product-skeleton">Loading...</div>}>
                <ProductCard id={6} delay={2000} />
              </Suspense>
            </div>
          </section>
          <Suspense fallback={<div class="skeleton reviews-skeleton">Loading reviews...</div>}>
            <Reviews />
          </Suspense>
          <Suspense fallback={<div class="skeleton newsletter-skeleton">Loading newsletter...</div>}>
            <Newsletter />
          </Suspense>
        </main>
      </div>
    </>
  )
}
