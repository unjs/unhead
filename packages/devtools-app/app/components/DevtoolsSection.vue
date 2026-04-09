<script setup lang="ts">
const {
  icon,
  text,
  description,
  collapse = true,
  padding = true,
} = defineProps<{
  icon?: string
  text?: string
  description?: string
  collapse?: boolean
  padding?: boolean
}>()

const open = defineModel('open', { default: true })

function onToggle(e: any) {
  open.value = e.target.open
}
</script>

<template>
  <details :open="open" class="section-block" @toggle="onToggle">
    <summary class="section-header" :class="collapse ? '' : 'pointer-events-none'">
      <div class="section-title" :class="open ? '' : 'opacity-60'">
        <UIcon v-if="icon" :name="icon" class="text-lg text-muted shrink-0" />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold">
            <slot name="text">
              {{ text }}
            </slot>
          </div>
          <div v-if="description || $slots.description" class="text-xs text-muted mt-0.5">
            <slot name="description">
              {{ description }}
            </slot>
          </div>
        </div>
        <slot name="actions" />
        <UIcon
          v-if="collapse"
          name="i-carbon-chevron-down"
          class="section-chevron text-muted"
        />
      </div>
    </summary>
    <div :class="padding ? 'p-3' : ''">
      <slot />
    </div>
  </details>
</template>

<style scoped>
.section-block {
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  overflow: hidden;
  background: var(--ui-bg-elevated);
}

.section-header {
  cursor: pointer;
  user-select: none;
  padding: 0.75rem;
  list-style: none;
  transition: background-color 150ms ease;
}
.section-header::-webkit-details-marker { display: none; }
.section-header:hover { background: var(--ui-bg-muted); }

details[open] > .section-header {
  border-bottom: 1px solid var(--ui-border);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: opacity 150ms ease;
}

.section-chevron {
  font-size: 0.875rem;
  shrink: 0;
  transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
}

details[open] .section-chevron {
  transform: rotate(180deg);
}
</style>
