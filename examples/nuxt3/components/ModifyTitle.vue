<script lang="ts" setup>
const props = defineProps<{
  title: string
}>()
await new Promise(resolve => setTimeout(resolve, 1000))

useHead({
  title: computed(() => props.title),
})
</script>

<template>
  <div>final title test</div>
</template>
