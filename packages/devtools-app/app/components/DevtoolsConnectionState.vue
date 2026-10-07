<script setup lang="ts">
import type { ConnectionStatus } from '~/composables/state'

const { status } = defineProps<{
  status: Exclude<ConnectionStatus, 'connected'>
}>()
</script>

<template>
  <DevtoolsEmptyState
    v-if="status === 'connecting'"
    icon="i-carbon-circle-dash"
    title="Connecting to your app"
    description="Reading head tags from the current page."
    icon-class="animate-spin motion-reduce:animate-none"
  />
  <DevtoolsEmptyState
    v-else
    icon="i-carbon-plug"
    title="Waiting for your app"
  >
    <template #description>
      Unhead reads head tags from a script in your app's page. Open this panel from the Vite DevTools dock in your app, then reload the page if the panel stays empty.
    </template>
  </DevtoolsEmptyState>
</template>
