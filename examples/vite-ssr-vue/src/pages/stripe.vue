<script setup lang="ts">
import { useScript } from '@unhead/vue'

const { elements, $script } = useScript<{ elements: (() => void) }>({
  src: 'https://js.stripe.com/v3/',
}, {
  use: () => window.Stripe('pk_test_TYooMQauvdEDq54NiTphI7jx'),
  trigger: 'idle',
})

$script.waitForUse().then(() => {
  console.log(elements)
})

useHead({
  title: () => $script.status.value,
})
</script>

<template>
  <div>
    <h1>stripe</h1>
    <div>
      script status: {{ $script.status }}
    </div>
  </div>
</template>

<style scoped>
h1,
a {
  color: green;
}
</style>
