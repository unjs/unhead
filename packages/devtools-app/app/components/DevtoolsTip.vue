<script setup lang="ts">
const {
  icon = 'i-carbon-idea',
  label = 'Tip',
} = defineProps<{
  icon?: string
  label?: string
}>()
</script>

<template>
  <div class="devtools-tip">
    <UIcon :name="icon" class="shrink-0 text-sm" aria-hidden="true" />
    <span v-if="label" class="devtools-tip__label">{{ label }}</span>
    <span class="text-xs">
      <slot />
    </span>
  </div>
</template>

<style scoped>
.devtools-tip {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.625rem;
  border-radius: var(--ui-radius);
  background: oklch(85% 0.06 230 / 0.06);
  border: 1px solid oklch(75% 0.06 230 / 0.12);
  color: oklch(55% 0.08 230);
  font-size: 0.75rem;
}
.dark .devtools-tip {
  background: oklch(35% 0.04 230 / 0.12);
  border-color: oklch(50% 0.06 230 / 0.15);
  color: oklch(78% 0.06 230);
}
.devtools-tip__label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.7;
}
</style>
