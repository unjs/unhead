<script lang="ts">
import { useHead } from '@unhead/svelte'

const data = { title: 'Winter Sale', subtitle: 'Up to 50% off selected items', discount: 50 }

useHead({
  title: 'StreamShop 3/11 - Loading...',
  meta: [
    { property: 'og:title', content: `${data.title} - ${data.discount}% Off` },
  ],
  style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:27%}' }],
})
</script>

<div class="hero-banner">
  <h1>{data.title}</h1>
  <p>{data.subtitle}</p>
  <button class="cta-button">Shop Now</button>
</div>
