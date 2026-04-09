<script setup lang="ts">
const {
  icon,
  variant = 'info',
} = defineProps<{
  icon?: string
  variant?: 'info' | 'warning' | 'error' | 'success'
}>()

const defaultIcons: Record<string, string> = {
  info: 'i-carbon-information',
  warning: 'i-carbon-warning',
  error: 'i-carbon-close-outline',
  success: 'i-carbon-checkmark-outline',
}
</script>

<template>
  <div class="devtools-alert" :class="`devtools-alert--${variant}`" :role="variant === 'error' ? 'alert' : 'status'">
    <UIcon :name="icon || defaultIcons[variant]" class="shrink-0" aria-hidden="true" />
    <div class="flex-1 min-w-0 text-sm">
      <slot />
    </div>
    <div v-if="$slots.action" class="ml-auto shrink-0">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.devtools-alert {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--ui-radius);
  border: 1px solid;
}

.devtools-alert--info {
  border-color: oklch(75% 0.1 230 / 0.2);
  background: oklch(85% 0.1 230 / 0.08);
  color: oklch(55% 0.12 230);
}
.dark .devtools-alert--info {
  background: oklch(45% 0.1 230 / 0.12);
  color: oklch(80% 0.1 230);
}

.devtools-alert--warning {
  border-color: oklch(75% 0.12 85 / 0.2);
  background: oklch(85% 0.12 85 / 0.08);
  color: oklch(55% 0.15 85);
}
.dark .devtools-alert--warning {
  background: oklch(45% 0.12 85 / 0.12);
  color: oklch(80% 0.12 85);
}

.devtools-alert--error {
  border-color: oklch(55% 0.15 25 / 0.25);
  background: oklch(65% 0.18 25 / 0.08);
  color: oklch(52% 0.18 25);
}
.dark .devtools-alert--error {
  background: oklch(40% 0.14 25 / 0.15);
  color: oklch(75% 0.14 25);
}

.devtools-alert--success {
  border-color: oklch(65% 0.12 145 / 0.2);
  background: oklch(75% 0.15 145 / 0.08);
  color: oklch(50% 0.15 145);
}
.dark .devtools-alert--success {
  background: oklch(50% 0.15 145 / 0.12);
  color: oklch(75% 0.18 145);
}
</style>
