<script setup lang="ts">
import { useScript, useHead } from '@unhead/vue'

const { status } = useScript<{ elements: (() => void) }>({
  src: 'https://js.stripe.com/v3/',
}, {
  // @ts-expect-error untyped
  use: () => window.Stripe?.('pk_test_TYooMQauvdEDq54NiTphI7jx'),
  trigger: typeof window !== 'undefined' ? window.requestIdleCallback : 'manual'
})

// load((res) => {
//   console.log('ready!', res)
// })

useHead({
  title: status,
})
</script>

<template>
  <div>
    <h1>stripe</h1>
    <div>
      script status: {{ status }}
    </div>
  </div>
</template>

<style scoped>
h1,
a {
  color: green;
}
</style>
