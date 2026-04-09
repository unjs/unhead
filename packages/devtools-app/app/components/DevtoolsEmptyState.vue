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
    <p v-if="description || $slots.description" class="text-xs text-muted max-w-sm mx-auto">
      <slot name="description">
        {{ description }}
      </slot>
    </p>
    <div v-if="$slots.default" class="mt-3">
      <slot />
    </div>
  </div>
</template>
