<script setup lang="ts">
import { state } from '~/composables/state'
</script>

<template>
  <div class="space-y-4">
    <DevtoolsTagTable :tags="state.tags" title="Resolved Tags" />

    <!-- Entries (always expanded) -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-carbon-list" class="text-lg" />
          <span class="font-medium">Head Entries ({{ state.entries.length }})</span>
        </div>
      </template>
      <div class="space-y-3">
        <DevtoolsHeadEntry v-for="entry in state.entries" :key="entry.id" :entry="entry" />
        <DevtoolsEmptyState v-if="!state.entries.length" icon="i-carbon-list" title="No entries detected" />
      </div>
    </UCard>

    <!-- Plugins -->
    <UCard v-if="state.plugins.length">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-carbon-plug" class="text-lg" />
          <span class="font-medium">Plugins ({{ state.plugins.length }})</span>
        </div>
      </template>
      <div class="flex flex-wrap gap-2">
        <UBadge v-for="plugin in state.plugins" :key="plugin" variant="subtle" size="xs">
          {{ plugin }}
        </UBadge>
      </div>
    </UCard>
  </div>
</template>
