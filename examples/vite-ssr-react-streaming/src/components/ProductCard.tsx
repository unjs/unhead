import { use } from 'react'
import { useHead } from '@unhead/react'

type Product = { id: number; name: string; price: number; rating: number; image: string }

const cache = new Map<string, Promise<Product>>()

const products: Record<number, Product> = {
  1: { id: 1, name: 'Wireless Headphones', price: 79.99, rating: 4.5, image: '🎧' },
  2: { id: 2, name: 'Smart Watch Pro', price: 199.99, rating: 4.8, image: '⌚' },
  3: { id: 3, name: 'Laptop Stand', price: 49.99, rating: 4.2, image: '💻' },
  4: { id: 4, name: 'USB-C Hub', price: 34.99, rating: 4.6, image: '🔌' },
  5: { id: 5, name: 'Mechanical Keyboard', price: 129.99, rating: 4.7, image: '⌨️' },
  6: { id: 6, name: 'Webcam HD', price: 89.99, rating: 4.3, image: '📷' },
}

export default function ProductCard({ id, delay }: { id: number; delay: number }) {
  const cacheKey = `product-${id}`
  if (!cache.has(cacheKey)) {
    const actualDelay = typeof window === 'undefined' ? delay : 0
    cache.set(cacheKey, new Promise(resolve =>
      setTimeout(() => resolve(products[id]), actualDelay)
    ))
    cache.get(cacheKey)!.finally(() => setTimeout(() => cache.delete(cacheKey), 100))
  }
  const product = use(cache.get(cacheKey)!)

  const progress = 3 + id // Products are 4-9 out of 11
  useHead({
    title: `StreamShop ${progress}/11 - Loading...`,
    meta: [{ name: `product-${id}-loaded`, content: 'true' }],
    style: [{ key: 'progress', innerHTML: `.stream-progress::after{width:${Math.round(progress/11*100)}%}` }],
  })

  return (
    <>
    <script dangerouslySetInnerHTML={{ __html: `window.__streamLog?.('📦 Product ${id}', '#4ade80')` }} />
    <div className="product-card" data-product-id={id}>
      <div className="product-image">{product.image}</div>
      <h4>{product.name}</h4>
      <div className="product-rating">{'★'.repeat(Math.floor(product.rating))}{'☆'.repeat(5 - Math.floor(product.rating))} ({product.rating})</div>
      <div className="product-price">${product.price}</div>
      <button className="add-to-cart">Add to Cart</button>
    </div>
    </>
  )
}
