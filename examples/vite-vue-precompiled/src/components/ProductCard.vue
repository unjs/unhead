<script setup lang="ts">
import { useHead } from '@unhead/vue/precompiled'

// Static plan: compiled into DOM-ready tuples for the client and pre-rendered
// HTML for the server. Disposal on unmount is retained, so toggling the
// component adds and removes these tags at runtime.
useHead({
  meta: [{ name: 'product:price:amount', content: '129.99' }],
  script: [
    {
      type: 'application/ld+json',
      // a plain static object: the bundler serializes it at build time.
      // JSON.stringify() would be a dynamic value and fail the build.
      innerHTML: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': 'Widget Pro',
      },
    },
  ],
})
</script>

<template>
  <section>
    <p>Price: $129.99</p>
  </section>
</template>
