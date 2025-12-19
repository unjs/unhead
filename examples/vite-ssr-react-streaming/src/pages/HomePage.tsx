import { Suspense } from 'react'
import { useHead } from '@unhead/react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import HeroBanner from '../components/HeroBanner'
import ProductCard from '../components/ProductCard'
import Reviews from '../components/Reviews'
import Newsletter from '../components/Newsletter'

export default function HomePage() {
  useHead({
    title: 'StreamShop - React Streaming SSR Demo',
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
    <div className="app">
      <div className="stream-progress" />
      <Suspense fallback={<div className="skeleton header-skeleton">Loading header...</div>}>
        <Header />
      </Suspense>

      <div className="main-layout">
        <Suspense fallback={<div className="skeleton sidebar-skeleton">Loading categories...</div>}>
          <Sidebar />
        </Suspense>

        <main className="content">
          <nav className="page-nav">
            <Link to="/" className="nav-link active">Home</Link>
            <Link to="/about" className="nav-link">About</Link>
          </nav>

          <Suspense fallback={<div className="skeleton hero-skeleton">Loading banner...</div>}>
            <HeroBanner />
          </Suspense>

          <section className="products-section">
            <h2>Featured Products</h2>
            <div className="product-grid">
              <Suspense fallback={<div className="skeleton product-skeleton">Loading...</div>}>
                <ProductCard id={1} delay={1375} />
              </Suspense>
              <Suspense fallback={<div className="skeleton product-skeleton">Loading...</div>}>
                <ProductCard id={2} delay={1500} />
              </Suspense>
              <Suspense fallback={<div className="skeleton product-skeleton">Loading...</div>}>
                <ProductCard id={3} delay={1625} />
              </Suspense>
              <Suspense fallback={<div className="skeleton product-skeleton">Loading...</div>}>
                <ProductCard id={4} delay={1750} />
              </Suspense>
              <Suspense fallback={<div className="skeleton product-skeleton">Loading...</div>}>
                <ProductCard id={5} delay={1875} />
              </Suspense>
              <Suspense fallback={<div className="skeleton product-skeleton">Loading...</div>}>
                <ProductCard id={6} delay={2000} />
              </Suspense>
            </div>
          </section>

          <Suspense fallback={<div className="skeleton reviews-skeleton">Loading reviews...</div>}>
            <Reviews />
          </Suspense>

          <Suspense fallback={<div className="skeleton newsletter-skeleton">Loading newsletter...</div>}>
            <Newsletter />
          </Suspense>
        </main>
      </div>

      <footer className="site-footer">
        <p>© 2024 StreamShop - React Streaming SSR Demo</p>
      </footer>
    </div>
  )
}
