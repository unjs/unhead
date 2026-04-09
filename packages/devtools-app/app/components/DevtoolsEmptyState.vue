<script setup lang="ts">
const {
  icon = 'i-carbon-search',
  title,
  description,
} = defineProps<{
  icon?: string
  title: string
  description?: string
}>()
</script>

<template>
  <div class="text-center py-12">
    <UIcon :name="icon" class="text-4xl text-muted mb-3" aria-hidden="true" />
    <p class="font-medium text-sm mb-1">
      {{ title }}
    </p>
    <div v-if="$slots.description" class="text-xs text-muted max-w-sm mx-auto">
      <slot name="description" />
    </div>
    <p v-else-if="description" class="text-xs text-muted max-w-sm mx-auto">
      {{ description }}
    </p>
    <div v-if="$slots.default" class="mt-3">
      <slot />
    </div>
  </div>
</template>
