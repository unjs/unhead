<script setup lang="ts">
import { useHead } from '@unhead/vue'

useHead({
  title: 'Foo <i>bar</i>',
  meta: [
    { name: 'description', content: '' },
    { name: 'twitter:creator', content: 'someuser' },
  ],
  link: [
    { rel: 'preload', href: '/font.woff2', as: 'font' },
  ],
})
</script>

<template>
  <div>hello</div>
</template>
