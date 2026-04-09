<script setup lang="ts">
const {
  title,
  closable = false,
  icon,
  padding = true,
} = defineProps<{
  title?: string
  closable?: boolean
  icon?: string
  padding?: boolean
}>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="devtools-panel">
    <div v-if="title || $slots.header" class="devtools-panel-header">
      <slot name="header">
        <div class="flex items-center gap-2">
          <UIcon v-if="icon" :name="icon" class="text-lg text-muted" />
          <span class="text-sm font-medium">{{ title }}</span>
        </div>
      </slot>
      <div v-if="closable || $slots.actions" class="flex items-center gap-1">
        <slot name="actions" />
        <UButton
          v-if="closable"
          icon="i-carbon-close"
          size="xs"
          variant="ghost"
          color="neutral"
          aria-label="Close panel"
          @click="$emit('close')"
        />
      </div>
    </div>
    <div :class="padding ? 'p-3' : ''">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.devtools-panel {
  display: flex;
  flex-direction: column;
  border-radius: var(--ui-radius);
  border: 1px solid var(--ui-border);
  background: var(--ui-bg-elevated);
  overflow: hidden;
}
.devtools-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-bg-muted);
}
</style>
