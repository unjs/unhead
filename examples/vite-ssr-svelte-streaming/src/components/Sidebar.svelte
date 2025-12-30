<script lang="ts">
import { useHead } from '@unhead/svelte'

const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Toys']

useHead({
  title: 'StreamShop 2/11 - Loading...',
  meta: [{ name: 'nav-loaded', content: 'true' }],
  style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:18%}' }],
})
</script>

<aside class="sidebar">
  <h3>Categories</h3>
  <ul>
    {#each categories as cat}
      <li><a href="#">{cat}</a></li>
    {/each}
  </ul>
  <div class="filters">
    <h4>Price Range</h4>
    <div class="price-range">$0 - $1000</div>
    <h4>Rating</h4>
    <div class="stars">**** & up</div>
  </div>
</aside>
