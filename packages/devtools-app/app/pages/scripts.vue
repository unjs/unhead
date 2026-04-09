<script setup lang="ts">
import { state } from '~/composables/state'

const PROTOCOL_RE = /^https?:\/\//

const scripts = computed(() => state.value.scripts || [])

type StatusFilter = 'all' | 'loaded' | 'loading' | 'awaitingLoad' | 'error' | 'removed'
const statusFilter = ref<StatusFilter>('all')

const scriptCounts = computed(() => {
  const counts: Record<string, number> = { all: scripts.value.length }
  for (const s of scripts.value) {
    counts[s.status] = (counts[s.status] || 0) + 1
  }
  return counts
})

const filteredScripts = computed(() => {
  if (statusFilter.value === 'all')
    return scripts.value
  return scripts.value.filter(s => s.status === statusFilter.value)
})

// Fetch script sizes via HEAD requests
const scriptSizes = ref<Record<string, string>>({})

async function fetchScriptSize(src: string) {
  if (!src || scriptSizes.value[src])
    return
  try {
    const res = await fetch(src, { method: 'HEAD' })
    const len = res.headers.get('content-length')
    if (len) {
      scriptSizes.value[src] = formatBytes(Number.parseInt(len, 10))
    }
  }
  catch {
    // silently ignore CORS or network errors
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Fetch sizes when scripts change
watch(scripts, (list) => {
  for (const s of list) {
    if (s.src)
      fetchScriptSize(s.src)
  }
}, { immediate: true })

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
    return 'bg-purple-500 motion-safe:animate-pulse'
  if (status === 'error')
    return 'bg-red-500'
  if (status === 'awaitingLoad')
    return 'bg-amber-400'
  if (status === 'removed')
    return 'bg-neutral-400'
  return 'bg-neutral-400'
}

function cleanUrl(src: string): string {
  return src.replace(PROTOCOL_RE, '')
}

function faviconUrl(src: string): string | null {
  try {
    const url = new URL(src)
    return `https://www.google.com/s2/favicons?domain=${url.hostname}`
  }
  catch {
    return null
  }
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts)
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })
}

function timeSinceFirst(events: { type: string, timestamp: number }[], ts: number): string {
  if (!events.length)
    return ''
  const first = events[0]!.timestamp
  const diff = ts - first
  if (diff < 1000)
    return `+${diff}ms`
  return `+${(diff / 1000).toFixed(1)}s`
}

const availableFilters = computed(() => {
  const filters: { key: StatusFilter, label: string }[] = [
    { key: 'all', label: 'All' },
  ]
  if (scriptCounts.value.loaded)
    filters.push({ key: 'loaded', label: 'Loaded' })
  if (scriptCounts.value.loading)
    filters.push({ key: 'loading', label: 'Loading' })
  if (scriptCounts.value.awaitingLoad)
    filters.push({ key: 'awaitingLoad', label: 'Awaiting' })
  if (scriptCounts.value.error)
    filters.push({ key: 'error', label: 'Error' })
  if (scriptCounts.value.removed)
    filters.push({ key: 'removed', label: 'Removed' })
  return filters
})

const expandedEvents = ref<Record<string, boolean>>({})

function toggleEvents(id: string) {
  expandedEvents.value = { ...expandedEvents.value, [id]: !expandedEvents.value[id] }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Empty state -->
    <DevtoolsEmptyState v-if="!scripts.length" icon="i-carbon-script" title="No scripts detected">
      <template #description>
        Use <code class="bg-elevated px-1.5 py-0.5 rounded text-xs">useScript()</code> to manage third-party scripts with loading strategies, triggers, and status tracking.
      </template>
    </DevtoolsEmptyState>

    <template v-else>
      <!-- Filter bar -->
      <div class="flex flex-wrap gap-1.5">
        <UBadge
          v-for="f in availableFilters"
          :key="f.key"
          :color="statusFilter === f.key ? 'primary' : 'neutral'"
          :variant="statusFilter === f.key ? 'solid' : 'subtle'"
          size="xs"
          class="cursor-pointer"
          @click="statusFilter = f.key"
        >
          {{ f.label }}
          <span class="ml-1 opacity-70 tabular-nums">{{ scriptCounts[f.key] || 0 }}</span>
        </UBadge>
      </div>

      <!-- Script cards -->
      <UCard v-for="script in filteredScripts" :key="script.id" class="overflow-hidden">
        <!-- Header: favicon + clean URL + status -->
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-7 h-7 rounded-lg bg-elevated border border-default flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img
                v-if="script.src && faviconUrl(script.src)"
                :src="faviconUrl(script.src)!"
                class="w-4 h-4 rounded-sm"
                alt=""
              >
              <UIcon v-else name="i-carbon-script" class="text-sm text-muted" />
            </div>
            <p class="text-sm font-mono text-highlighted truncate">
              {{ script.src ? cleanUrl(script.src) : '(inline)' }}
            </p>
          </div>
          <UBadge :color="statusColor(script.status)" variant="subtle" size="xs" class="flex-shrink-0">
            <span class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full" :class="statusDotClass(script.status)" />
              {{ script.status }}
            </span>
          </UBadge>
        </div>

        <!-- Metric badges -->
        <div class="flex flex-wrap gap-1.5 mt-3">
          <DevtoolsMetric
            v-if="script.src && scriptSizes[script.src]"
            icon="i-carbon-data-volume"
            :value="scriptSizes[script.src]!"
            label="size"
          />
          <DevtoolsMetric
            v-if="script.warmupStrategy"
            icon="i-carbon-flash"
            :value="script.warmupStrategy"
            label="warmup"
          />
          <DevtoolsMetric
            v-if="script.fetchpriority"
            icon="i-carbon-meter-alt"
            :value="script.fetchpriority"
            label="priority"
          />
          <DevtoolsMetric
            v-if="script.defer"
            icon="i-carbon-time"
            value="defer"
          />
          <DevtoolsMetric
            v-if="script.async"
            icon="i-carbon-flash-filled"
            value="async"
          />
          <DevtoolsMetric
            v-if="script.crossorigin"
            icon="i-carbon-locked"
            :value="script.crossorigin"
            label="CORS"
          />
        </div>

        <!-- Events (collapsible) -->
        <div v-if="script.events?.length" class="border-t border-default mt-3 -mx-4 -mb-4">
          <button
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted hover:text-highlighted w-full"
            @click="toggleEvents(script.id)"
          >
            <UIcon
              name="i-carbon-chevron-right"
              class="text-xs transition-transform"
              :class="expandedEvents[script.id] ? 'rotate-90' : ''"
            />
            Events
            <span class="text-[9px] px-1 py-px rounded-full bg-elevated tabular-nums font-mono">
              {{ script.events.length }}
            </span>
          </button>

          <div v-if="expandedEvents[script.id]" class="px-3 pb-3">
            <div class="space-y-1">
              <div
                v-for="(event, idx) in script.events"
                :key="idx"
                class="flex items-center gap-2 py-1 px-2 rounded hover:bg-elevated text-xs"
              >
                <span class="font-mono text-muted tabular-nums text-[10px] w-20 flex-shrink-0">
                  {{ formatTimestamp(event.timestamp) }}
                </span>
                <span
                  v-if="idx > 0"
                  class="font-mono text-muted text-[10px] w-14 flex-shrink-0"
                >
                  {{ timeSinceFirst(script.events, event.timestamp) }}
                </span>
                <span v-else class="w-14 flex-shrink-0" />
                <UBadge :color="statusColor(event.type)" variant="subtle" size="xs">
                  <span class="flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full" :class="statusDotClass(event.type)" />
                    {{ event.type }}
                  </span>
                </UBadge>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
