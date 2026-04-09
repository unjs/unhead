<script setup lang="ts">
const {
  label,
  code,
  lang = 'json',
} = defineProps<{
  label?: string
  code: string
  lang?: 'js' | 'json' | 'xml' | 'css'
}>()
</script>

<template>
  <div class="devtools-snippet">
    <div v-if="label || $slots.header" class="devtools-snippet-header">
      <slot name="header">
        <code class="text-xs font-mono text-muted">{{ label }}</code>
      </slot>
      <DevtoolsCopyButton :text="code" />
    </div>
    <OCodeBlock :code="code" :lang="lang" class="devtools-snippet-block" />
  </div>
</template>

<style scoped>
.devtools-snippet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.375rem;
}
.devtools-snippet-block {
  border-radius: var(--ui-radius);
  padding: 0.5rem 0.625rem;
  max-height: 300px;
  overflow-y: auto;
  background: var(--ui-bg-elevated);
}
</style>
