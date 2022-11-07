<script lang="ts">
import { defineComponent } from 'vue'
import type { MetaObject } from '@nuxt/schema'

export default defineComponent({
  head: {
    title: 'Options',
    meta: [
      {
        hid: 'description',
        name: 'description',
        content: 'My basic description',
      },
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    ],
  },
})
</script>

<template>
<div>
  options api - basic
</div>
</template>
