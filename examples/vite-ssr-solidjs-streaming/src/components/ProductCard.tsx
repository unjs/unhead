import { createResource, Show } from 'solid-js'
import { useHead } from '@unhead/solid-js'

interface Product {
  id: number
  name: string
  price: number
  rating: number
  image: string
}

const products: Record<number, Product> = {
  1: { id: 1, name: 'Wireless Headphones', price: 79.99, rating: 4.5, image: '🎧' },
  2: { id: 2, name: 'Smart Watch Pro', price: 199.99, rating: 4.8, image: '⌚' },
  3: { id: 3, name: 'Laptop Stand', price: 49.99, rating: 4.2, image: '💻' },
  4: { id: 4, name: 'USB-C Hub', price: 34.99, rating: 4.6, image: '🔌' },
  5: { id: 5, name: 'Mechanical Keyboard', price: 129.99, rating: 4.7, image: '⌨️' },
  6: { id: 6, name: 'Webcam HD', price: 89.99, rating: 4.3, image: '📷' },
}

interface ProductCardProps {
  id: number
  delay: number
}

const fetchProduct = async (id: number, delay: number): Promise<Product> => {
  await new Promise(r => setTimeout(r, delay))
  return products[id]
}

export default function ProductCard(props: ProductCardProps) {
  const [product] = createResource(() => fetchProduct(props.id, props.delay))
  const progress = 3 + props.id

  useHead({
    title: `StreamShop ${progress}/11 - Loading...`,
    meta: [{ name: `product-${props.id}-loaded`, content: 'true' }],
    style: [{ key: 'progress', innerHTML: `.stream-progress::after{width:${Math.round(progress / 11 * 100)}%}` }],
  })

  return (
    <Show when={product()}>
      {p => (
        <div class="product-card" data-product-id={props.id}>
          <div class="product-image">{p().image}</div>
          <h4>{p().name}</h4>
          <div class="product-rating">{'★'.repeat(Math.floor(p().rating))}{'☆'.repeat(5 - Math.floor(p().rating))} ({p().rating})</div>
          <div class="product-price">${p().price}</div>
          <button class="add-to-cart">Add to Cart</button>
        </div>
      )}
    </Show>
  )
}
