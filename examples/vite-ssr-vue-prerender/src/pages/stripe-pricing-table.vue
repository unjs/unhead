<script setup lang="ts">
import { ref } from 'vue'
import {useScript} from "@unhead/vue";

const rootEl = ref()
const { onLoaded, status } = useScript(`https://js.stripe.com/v3/pricing-table.js`, {
  trigger: typeof window !== 'undefined' ? new Promise(resolve => {
    requestIdleCallback(() => {
      resolve()
    })
  }) : 'manual',
})

onLoaded(() => {
  console.log('READY!')
})
</script>

<template>
<div ref="rootEl">
  <div>status:</div>
  <slot v-if="status === 'loading'" name="loading">
    <div>Loading...</div>
  </slot>
  <slot v-if="status === 'awaitingLoad'" name="awaitingLoad">
    <div>Awaiting load...</div>
  </slot>
  <slot v-if="status === 'loaded'" name="awaitingLoad">
    <div>Loaded...</div>
  </slot>
  <slot />
</div>
</template>
