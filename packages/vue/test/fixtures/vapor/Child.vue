<script setup lang="ts" vapor>
import { useHead } from '@unhead/vue'

const props = defineProps<{ title: string }>()

useHead({
  title: () => props.title,
  meta: [{ name: 'robots', content: 'noindex' }],
})
</script>

<template>
  <p data-vapor-child>
    {{ title }}
  </p>
</template>
