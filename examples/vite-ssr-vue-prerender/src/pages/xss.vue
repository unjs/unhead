<script lang="ts" setup>
import { useHead, useServerHead } from '@unhead/vue'

useHead({
  script: [
    // we shouldn't be able to escape the script tag like this
    { type: 'application/ld+json', innerHTML: { foo: '<\/script><script>alert(3)<\/script>' } },
  ],
})

useServerHead({
  templateParams: {
    foo: '<\/script><script>alert(4)<\/script>',
  },
})

useServerHead({
  script: [
    { innerHTML: '<!-- comment start' },
  ],
})
</script>

<template>
  <div>XSS</div>
</template>
