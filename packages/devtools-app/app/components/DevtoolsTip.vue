<script setup lang="ts">
const {
  icon,
  done = false,
  html,
} = defineProps<{
  icon?: string
  done?: boolean
  html?: string
}>()
</script>

<template>
  <div class="devtools-tip" :class="done ? 'devtools-tip--done' : 'devtools-tip--missing'">
    <UIcon
      :name="icon || (done ? 'i-carbon-checkmark-filled' : 'i-carbon-idea')"
      class="shrink-0 text-sm devtools-tip__icon"
      aria-hidden="true"
    />
    <!-- eslint-disable-next-line vue/no-v-html -->
    <span v-if="html" class="devtools-tip__text" v-html="html" />
    <span v-else class="devtools-tip__text">
      <slot />
    </span>
  </div>
</template>

<style scoped>
.devtools-tip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.625rem;
  border-radius: var(--ui-radius);
  font-size: 0.75rem;
  border: 1px solid transparent;
}

/* Missing / suggestion state */
.devtools-tip--missing {
  background: oklch(85% 0.06 230 / 0.06);
  border-color: oklch(75% 0.06 230 / 0.12);
  color: oklch(55% 0.08 230);
}
.dark .devtools-tip--missing {
  background: oklch(35% 0.04 230 / 0.12);
  border-color: oklch(50% 0.06 230 / 0.15);
  color: oklch(78% 0.06 230);
}

/* Done / satisfied state */
.devtools-tip--done {
  color: var(--ui-text-muted);
}
.devtools-tip--done .devtools-tip__icon {
  color: oklch(65% 0.15 145);
}
.dark .devtools-tip--done .devtools-tip__icon {
  color: oklch(72% 0.15 145);
}

.devtools-tip__text {
  font-size: 0.75rem;
}
.devtools-tip__text :deep(code) {
  background: var(--ui-bg-elevated);
  padding: 0.0625rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.6875rem;
}
</style>
