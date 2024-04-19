<script setup lang="ts">
import { useScript } from '@unhead/vue'

const { dataLayer, $script } = useScript<{ dataLayer: any[] }>({
  src: 'https://www.googletagmanager.com/gtm.js?id=GTM-MNJD4B',
}, {
  stub({ fn }) {
    return fn === 'dataLayer' && typeof window === 'undefined' ? [] : undefined
  },
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

dataLayer.push({
  event: 'page_view',
  page_path: '/stripe',
})

$script.then((res) => {
  console.log('ready!', res)
})

useHead({
  title: $script.status,
})
</script>

<template>
<div>
  <h1>gtm</h1>
  <div>
    script status: {{ $script.status }}
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
