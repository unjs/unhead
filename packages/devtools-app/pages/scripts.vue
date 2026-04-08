<script setup lang="ts">
import { state } from '~/composables/state'

const scripts = computed(() => state.value.scripts || [])

const statusGroups = computed(() => {
  const groups: Record<string, number> = {}
  for (const s of scripts.value) {
    groups[s.status] = (groups[s.status] || 0) + 1
  }
  return groups
})

function statusColor(status: string) {
  if (status === 'loaded')
    return 'success'
  if (status === 'loading')
    return 'info'
  if (status === 'error')
    return 'error'
  if (status === 'awaitingLoad')
    return 'warning'
  if (status === 'removed')
    return 'neutral'
  return 'neutral'
}

function statusDotClass(status: string) {
  if (status === 'loaded')
    return 'bg-green-500'
  if (status === 'loading')
    return 'bg-purple-500 animate-pulse'
  if (status === 'error')
    return 'bg-red-500'
  if (status === 'awaitingLoad')
    return 'bg-amber-400'
  if (status === 'removed')
    return 'bg-neutral-400'
  return 'bg-neutral-400'
}

function extractDomain(src: string): string {
  try {
    return new URL(src).hostname
  }
  catch {
    return src
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Empty state -->
    <div v-if="!scripts.length" class="text-center py-12">
      <UIcon name="i-carbon-script" class="text-4xl text-[var(--ui-text-muted)] mb-3" />
      <p class="font-medium text-sm mb-1">
        No scripts detected
      </p>
      <p class="text-xs text-[var(--ui-text-muted)] max-w-sm mx-auto">
        Use <code class="bg-[var(--ui-bg-elevated)] px-1.5 py-0.5 rounded text-xs">useScript()</code> to manage third-party scripts with loading strategies, triggers, and status tracking.
      </p>
    </div>

    <template v-else>
      <!-- Status overview badges -->
      <div class="flex flex-wrap gap-2">
        <UBadge
          v-for="(count, status) in statusGroups"
          :key="status"
          :color="statusColor(status as string)"
          variant="subtle"
          size="sm"
        >
          {{ count }} {{ status }}
        </UBadge>
      </div>

      <!-- Script cards -->
      <UCard v-for="script in scripts" :key="script.id">
        <div class="flex items-start gap-3">
          <!-- Status dot -->
          <div class="mt-1.5">
            <div class="w-2.5 h-2.5 rounded-full" :class="statusDotClass(script.status)" />
          </div>

          <!-- Script info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-medium text-sm">{{ script.id }}</span>
              <UBadge :color="statusColor(script.status)" variant="subtle" size="xs">
                {{ script.status }}
              </UBadge>
            </div>
            <p v-if="script.src" class="text-xs font-mono text-[var(--ui-text-muted)] truncate">
              {{ script.src }}
            </p>
            <p v-if="script.src" class="text-xs text-[var(--ui-text-muted)] mt-0.5">
              {{ extractDomain(script.src) }}
            </p>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
