import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import HeroBanner from '../components/HeroBanner'
import ProductCard from '../components/ProductCard'
import Reviews from '../components/Reviews'
import Newsletter from '../components/Newsletter'

export default function HomePage() {
  return (
    <>
      <Header />
      <div class="main-layout">
        <Sidebar />
        <main class="content">
          <HeroBanner />
          <section class="products-section">
            <h2>Featured Products</h2>
            <div class="product-grid">
              <ProductCard id={1} />
              <ProductCard id={2} />
              <ProductCard id={3} />
              <ProductCard id={4} />
              <ProductCard id={5} />
              <ProductCard id={6} />
            </div>
          </section>
          <Reviews />
          <Newsletter />
        </main>
      </div>
    </>
  )
}
