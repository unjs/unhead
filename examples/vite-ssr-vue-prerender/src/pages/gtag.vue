<script setup lang="ts">
import { useScript, useHead } from '@unhead/vue'

declare global {
  interface Window {
    dataLayer: any[]
  }
}

const { proxy: gtag, status, onLoaded } = useScript({
  src: 'https://www.googletagmanager.com/gtm.js?id=GTM-MNJD4B',
}, {
  beforeInit() {
    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || []
      window.dataLayer.push({'gtm.start': new Date().getTime(), 'event': 'gtm.js'})
    }
  },
  use() {
    return {
      dataLayer: window.dataLayer
    }
  },
  trigger: typeof window !== 'undefined' ? window.requestIdleCallback : 'manual'
})
const { dataLayer } = gtag

dataLayer.push({
  event: 'page_view',
  page_path: '/stripe',
})

onLoaded((res) => {
  console.log('ready!', res)
})

useHead({
  title: status,
})
</script>

<template>
<div>
  <h1>gtm</h1>
  <div>
    script status: {{ status }}
  </div>
  <div>
    data layer:
    <div v-for="data in dataLayer">
      {{ data }}
    </div>
  </div>
</div>
</template>

<style scoped>
h1,
a {
  color: green;
}
</style>
