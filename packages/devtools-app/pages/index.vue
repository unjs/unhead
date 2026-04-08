<script setup lang="ts">
import { state } from '~/composables/state'

const tagFilter = ref('')

const filteredTags = computed(() => {
  const filter = tagFilter.value.toLowerCase()
  if (!filter)
    return state.value.tags
  return state.value.tags.filter((t) => {
    const name = t.props?.name || t.props?.property || t.props?.rel || t.props?.src || ''
    return t.tag.includes(filter) || name.toLowerCase().includes(filter) || (t.source || '').toLowerCase().includes(filter)
  })
})

const tagTypeCounts = computed(() => state.value.tagTypeCounts)
const validationRules = computed(() => state.value.validationRules || [])
const warnRules = computed(() => validationRules.value.filter(r => r.severity === 'warn'))
const infoRules = computed(() => validationRules.value.filter(r => r.severity === 'info'))
const hasValidatePlugin = computed(() => state.value.plugins.includes('validate'))

function tagIdentifier(tag: any): string {
  if (tag.tag === 'meta')
    return tag.props?.name || tag.props?.property || ''
  if (tag.tag === 'link')
    return tag.props?.rel || ''
  if (tag.tag === 'script')
    return tag.props?.src || '(inline)'
  return tag.textContent || ''
}

function tagValue(tag: any): string {
  if (tag.tag === 'meta')
    return tag.props?.content || ''
  if (tag.tag === 'title')
    return tag.textContent || ''
  if (tag.tag === 'link')
    return tag.props?.href || ''
  if (tag.tag === 'script')
    return tag.props?.src || '(inline)'
  return ''
}
</script>

<template>
  <div class="space-y-4">
    <!-- Validation Rules -->
    <UCard v-if="validationRules.length">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-carbon-warning-alt" class="text-lg" />
            <span class="font-medium">Validation ({{ validationRules.length }})</span>
          </div>
          <div class="flex gap-2">
            <UBadge v-if="warnRules.length" color="warning" variant="subtle" size="xs">
              {{ warnRules.length }} warnings
            </UBadge>
            <UBadge v-if="infoRules.length" color="info" variant="subtle" size="xs">
              {{ infoRules.length }} info
            </UBadge>
          </div>
        </div>
      </template>
      <div class="space-y-1">
        <div v-for="(rule, i) in validationRules" :key="i" class="flex items-start gap-2 px-3 py-2.5 rounded-md hover:bg-elevated transition-colors">
          <UIcon
            :name="rule.severity === 'warn' ? 'i-carbon-warning-filled' : 'i-carbon-information-filled'"
            class="text-base mt-0.5 shrink-0"
            :class="rule.severity === 'warn' ? 'text-amber-500' : 'text-blue-400'"
          />
          <div class="min-w-0">
            <span class="text-sm font-mono">{{ rule.id }}</span>
            <p class="text-xs text-muted">
              {{ rule.message }}
            </p>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Tag Type Badges -->
    <div v-if="Object.keys(tagTypeCounts).length" class="flex flex-wrap gap-2">
      <UBadge
        v-for="(count, tag) in tagTypeCounts"
        :key="tag"
        variant="subtle"
        size="sm"
      >
        {{ count }} {{ tag }}
      </UBadge>
    </div>

    <!-- Tags Table -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-carbon-tag-group" class="text-lg" />
            <span class="font-medium">Resolved Tags ({{ state.tags.length }})</span>
          </div>
          <UInput v-model="tagFilter" placeholder="Filter tags..." size="xs" class="w-48" />
        </div>
      </template>
      <div class="overflow-auto max-h-[400px]">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-default">
            <tr class="text-left text-muted border-b border-default">
              <th class="p-2 w-20">
                Tag
              </th>
              <th class="p-2">
                Identifier
              </th>
              <th class="p-2">
                Value
              </th>
              <th class="p-2">
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(tag, i) in filteredTags"
              :key="i"
              class="border-b border-default hover:bg-elevated transition-colors"
            >
              <td class="p-2">
                <UBadge variant="subtle" size="xs">
                  {{ tag.tag }}
                </UBadge>
              </td>
              <td class="p-2 font-mono text-xs">
                {{ tagIdentifier(tag) }}
              </td>
              <td class="p-2 font-mono text-xs max-w-[300px] truncate">
                {{ tagValue(tag) }}
              </td>
              <td class="p-2 font-mono text-xs text-muted">
                {{ tag.source || '' }}
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!filteredTags.length" class="p-4 text-center text-muted">
          No tags found.
        </p>
      </div>
    </UCard>

    <!-- Entries (always expanded) -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-carbon-list" class="text-lg" />
          <span class="font-medium">Head Entries ({{ state.entries.length }})</span>
        </div>
      </template>
      <div class="space-y-3">
        <div
          v-for="entry in state.entries"
          :key="entry.id"
          class="border border-default rounded-lg overflow-hidden"
        >
          <div class="flex items-center gap-3 p-3 border-b border-default bg-default">
            <span class="font-mono text-sm">#{{ entry.id }}</span>
            <UBadge variant="subtle" size="xs">
              {{ entry.tagCount }} tags
            </UBadge>
            <span v-if="entry.source" class="text-xs text-muted font-mono ml-auto">
              {{ entry.source }}
            </span>
          </div>
          <div class="p-3 bg-elevated">
            <pre class="text-xs font-mono overflow-auto leading-relaxed">{{ JSON.stringify(entry.input, null, 2) }}</pre>
          </div>
        </div>
        <p v-if="!state.entries.length" class="p-4 text-center text-muted">
          No entries detected.
        </p>
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
        <UBadge v-for="plugin in state.plugins" :key="plugin" variant="subtle" size="sm">
          {{ plugin }}
        </UBadge>
      </div>
    </UCard>

    <!-- No validation plugin hint -->
    <div v-if="!validationRules.length && !hasValidatePlugin" class="text-center py-6">
      <UIcon name="i-carbon-information" class="text-2xl text-muted mb-2" />
      <p class="text-muted text-sm">
        Add <code class="bg-elevated px-1.5 py-0.5 rounded text-xs">ValidatePlugin</code> to enable validation rules.
      </p>
    </div>
  </div>
</template>
