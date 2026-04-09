<script setup lang="ts">
export interface KeyValueItem {
  key: string
  value: string | number | boolean | undefined
  copyable?: boolean
  mono?: boolean
  link?: string
  code?: 'js' | 'json' | 'xml' | 'css'
}

const { items, striped = false } = defineProps<{
  items: KeyValueItem[]
  striped?: boolean
}>()

const urlRe = /^https?:\/\/\S+$/
const colorRe = /^#(?:[0-9a-f]{3,4}){1,2}$|^rgba?\([\d\s,./]+\)$|^hsla?\([\d\s%,./]+\)$/i

function isAutoLink(item: KeyValueItem): boolean {
  return !item.link && !item.code && typeof item.value === 'string' && urlRe.test(item.value)
}

function isColor(item: KeyValueItem): boolean {
  return typeof item.value === 'string' && colorRe.test(item.value.trim())
}
</script>

<template>
  <div class="divide-y divide-[var(--ui-border)]">
    <div
      v-for="item in items"
      :key="item.key"
      class="devtools-kv-row group"
      :class="{
        'devtools-kv-striped': striped,
        'devtools-kv-stacked': !!item.code,
      }"
    >
      <span class="devtools-kv-key">{{ item.key }}</span>
      <div class="devtools-kv-value-wrap" :class="{ 'w-full': !!item.code }">
        <a
          v-if="item.link"
          :href="item.link"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-muted hover:text-default flex items-center gap-1"
        >
          {{ item.value }}
          <UIcon name="i-carbon-launch" class="text-xs" />
        </a>
        <DevtoolsSnippet
          v-else-if="item.code && item.value !== undefined && item.value !== ''"
          :code="String(item.value)"
          :lang="item.code"
          class="w-full"
        />
        <a
          v-else-if="isAutoLink(item)"
          :href="String(item.value)"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-muted hover:text-default flex items-center gap-1"
        >
          {{ item.value }}
          <UIcon name="i-carbon-launch" class="text-xs" />
        </a>
        <span
          v-else
          class="devtools-kv-value flex items-center gap-1.5"
          :class="{
            'font-mono': item.mono !== false,
            'text-green-500': item.value === true,
            'text-red-400': item.value === false,
            'text-muted italic': item.value === undefined || item.value === '',
          }"
        >
          <span
            v-if="isColor(item)"
            class="inline-block w-3 h-3 rounded-sm shrink-0 border border-[var(--ui-border)]"
            :style="{ background: String(item.value).trim() }"
          />
          {{ item.value === undefined || item.value === '' ? '(empty)' : item.value }}
        </span>
        <DevtoolsCopyButton
          v-if="!item.code && item.copyable && item.value !== undefined && item.value !== ''"
          :text="String(item.value)"
          class="opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.devtools-kv-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
  transition: background-color 150ms ease;
}
.devtools-kv-row.devtools-kv-stacked {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.375rem;
}
.devtools-kv-row:hover {
  background: var(--ui-bg-muted);
}
.devtools-kv-striped:nth-child(even) {
  background: var(--ui-bg-muted);
}
.devtools-kv-key {
  font-size: 0.8125rem;
  font-family: var(--font-mono);
  color: var(--ui-text-muted);
  flex-shrink: 0;
}
.devtools-kv-value-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}
.devtools-kv-value {
  font-size: 0.8125rem;
  text-align: right;
  overflow-wrap: break-word;
  word-break: break-all;
}
</style>
