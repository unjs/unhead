<script lang="ts">
import { defineComponent } from 'vue'
import type { MetaObject } from '@nuxt/schema'

export default defineComponent({
  head(nuxtApp) {
    return (() => ({
      title: `Options - ${nuxtApp.vueApp._uid}`,
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: 'function desc',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    }))
  },
})
</script>

<template>
<div>
  options api - function
</div>
</template>
