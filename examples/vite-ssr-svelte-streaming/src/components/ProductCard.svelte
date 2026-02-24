<script lang="ts">
import { useHead } from '@unhead/svelte'

interface Props {
  id: number
  delay?: number
}

let { id, delay = 1000 }: Props = $props()

type Product = { id: number; name: string; price: number; rating: number; image: string }

const products: Record<number, Product> = {
  1: { id: 1, name: 'Wireless Headphones', price: 79.99, rating: 4.5, image: '🎧' },
  2: { id: 2, name: 'Smart Watch Pro', price: 199.99, rating: 4.8, image: '⌚' },
  3: { id: 3, name: 'Laptop Stand', price: 49.99, rating: 4.2, image: '💻' },
  4: { id: 4, name: 'USB-C Hub', price: 34.99, rating: 4.6, image: '🔌' },
  5: { id: 5, name: 'Mechanical Keyboard', price: 129.99, rating: 4.7, image: '⌨️' },
  6: { id: 6, name: 'Webcam HD', price: 89.99, rating: 4.3, image: '📷' },
}

const fetchProduct = async (): Promise<Product> => {
  await new Promise(r => setTimeout(r, delay))
  return products[id]
}

const product = await fetchProduct()
const progress = 3 + id

useHead({
  title: `StreamShop ${progress}/11 - Loading...`,
  meta: [{ name: `product-${id}-loaded`, content: 'true' }],
  style: [{ key: 'progress', innerHTML: `.stream-progress::after{width:${Math.round(progress/11*100)}%}` }],
})
</script>

<svelte:boundary>
  <div class="product-card" data-product-id={id}>
    <div class="product-image">{product.image}</div>
    <h4>{product.name}</h4>
    <div class="product-rating">{'★'.repeat(Math.floor(product.rating))}{'☆'.repeat(5 - Math.floor(product.rating))} ({product.rating})</div>
    <div class="product-price">${product.price}</div>
    <button class="add-to-cart">Add to Cart</button>
  </div>
  {#snippet pending()}
    <div class="product-card skeleton product-skeleton">Loading...</div>
  {/snippet}
</svelte:boundary>
