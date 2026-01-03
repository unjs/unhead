<script lang="ts">
import { useHead } from '@unhead/svelte'

const data = { subscribers: 50000, discount: 10 }

useHead({
  title: 'StreamShop - Ready!',
  meta: [{ name: 'newsletter-status', content: 'loaded' }],
  style: [{ key: 'progress', innerHTML: '.stream-progress{opacity:0;transition:opacity 0.3s}' }],
})
</script>

<div class="newsletter">
  <h3>Join Our Newsletter</h3>
  <p>Get {data.discount}% off your first order! Join {data.subscribers.toLocaleString()}+ subscribers.</p>
  <div class="newsletter-form">
    <input type="email" placeholder="Enter your email" />
    <button>Subscribe</button>
  </div>
</div>
