<script setup lang="ts">
import type { SerializedEntry } from '~/composables/state'

const { entry } = defineProps<{
  entry: SerializedEntry
}>()

const modeConfig = {
  server: { color: 'info', icon: 'i-carbon-cloud' },
  client: { color: 'warning', icon: 'i-carbon-laptop' },
  hydrated: { color: 'success', icon: 'i-carbon-arrows-horizontal' },
} as const
</script>

<template>
  <details class="border border-default rounded-lg overflow-hidden group">
    <summary class="flex items-center gap-3 p-3 bg-default cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
      <UIcon name="i-carbon-chevron-right" class="text-xs transition-transform group-open:rotate-90 shrink-0" />
      <span class="font-mono text-sm">#{{ entry.id }}</span>
      <UBadge variant="subtle" size="xs">
        {{ entry.tagCount }} tags
      </UBadge>
      <UBadge :color="modeConfig[entry.mode]?.color || 'neutral'" variant="subtle" size="xs">
        <UIcon :name="modeConfig[entry.mode]?.icon || 'i-carbon-help'" class="text-xs" />
        {{ entry.mode }}
      </UBadge>
      <span v-if="entry.source" class="text-xs text-muted font-mono ml-auto">
        {{ entry.source }}
      </span>
    </summary>
    <div class="p-3 bg-elevated border-t border-default">
      <OCodeBlock :code="JSON.stringify(entry.input, null, 2)" lang="json" />
    </div>
  </details>
</template>
