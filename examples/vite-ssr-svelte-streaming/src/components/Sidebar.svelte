<script lang="ts">
import { useHead } from '@unhead/svelte'

const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Toys']

const fetchCategories = async () => {
  await new Promise(r => setTimeout(r, 500))
  return categories
}

const cats = await fetchCategories()

useHead({
  title: 'StreamShop 2/11 - Loading...',
  meta: [{ name: 'nav-loaded', content: 'true' }],
  style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:18%}' }],
})
</script>

<svelte:boundary>
  <aside class="sidebar">
    <h3>Categories</h3>
    <ul>
      {#each cats as cat}
        <li><a href="/category/{cat}">{cat}</a></li>
      {/each}
    </ul>
    <div class="filters">
      <h4>Price Range</h4>
      <div class="price-range">$0 - $1000</div>
      <h4>Rating</h4>
      <div class="stars">★★★★☆ & up</div>
    </div>
  </aside>
  {#snippet pending()}
    <aside class="sidebar skeleton sidebar-skeleton">Loading categories...</aside>
  {/snippet}
</svelte:boundary>
