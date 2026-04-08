<script setup lang="ts">
import { state } from '~/composables/state'
import {
  analyzeNodeProperties,
  formatPropertyValue,
  getNestedProperty,
  getNodeDescription,
  getNodeType,
  getSchemaIcon,
  googleRichResultsRequirements,
  isRichResultType,
  nodeToSchemaOrgLink,
  validateGraph,
} from '~/utils/schema-validation'

// Extract JSON-LD from script tags
const jsonLdData = computed(() => {
  const jsonLdTags = state.value.tags.filter(
    t => t.tag === 'script' && t.props?.type === 'application/ld+json',
  )
  if (!jsonLdTags.length)
    return null

  // Merge all JSON-LD blocks
  for (const tag of jsonLdTags) {
    try {
      return JSON.parse(tag.innerHTML || '{}')
    }
    catch {
      continue
    }
  }
  return null
})

const validation = computed(() => {
  if (!jsonLdData.value)
    return null
  return validateGraph(jsonLdData.value)
})

const overallStatus = computed(() => {
  if (!validation.value)
    return null
  const { summary } = validation.value

  if (summary.totalNodes === 0) {
    return { variant: 'warning' as const, message: 'No structured data nodes detected.' }
  }
  if (summary.totalErrors > 0) {
    return { variant: 'error' as const, message: `${summary.totalErrors} missing required propert${summary.totalErrors > 1 ? 'ies' : 'y'} across ${summary.totalNodes} node${summary.totalNodes > 1 ? 's' : ''}` }
  }
  if (summary.totalWarnings > 0) {
    return { variant: 'warning' as const, message: `${summary.totalWarnings} missing recommended propert${summary.totalWarnings > 1 ? 'ies' : 'y'}` }
  }
  return { variant: 'success' as const, message: `All ${summary.totalNodes} node${summary.totalNodes > 1 ? 's' : ''} validated.` }
})

const displayNodes = computed(() => {
  if (!validation.value)
    return []
  return validation.value.nodes.filter(node => getNodeType(node) !== 'Unknown')
})

const cardViewModes = reactive(new Map<number, 'validate' | 'json'>())

function getCardView(index: number) {
  return cardViewModes.get(index) || 'validate'
}

function setCardView(index: number, mode: 'validate' | 'json') {
  cardViewModes.set(index, mode)
}
</script>

<template>
  <div class="space-y-4">
    <!-- No JSON-LD detected -->
    <div v-if="!jsonLdData" class="text-center py-12">
      <UIcon name="i-carbon-chart-relationship" class="text-4xl text-[var(--ui-text-muted)] mb-3" />
      <p class="font-medium text-sm mb-1">
        No structured data detected
      </p>
      <p class="text-xs text-[var(--ui-text-muted)] max-w-sm mx-auto">
        Add JSON-LD structured data via <code class="bg-[var(--ui-bg-elevated)] px-1.5 py-0.5 rounded text-xs">useSchemaOrg()</code> or <code class="bg-[var(--ui-bg-elevated)] px-1.5 py-0.5 rounded text-xs">useHead()</code> with a script tag.
      </p>
    </div>

    <template v-else>
      <!-- Status -->
      <div
        v-if="overallStatus"
        class="flex items-center gap-3 p-3 rounded-lg border"
        :class="{
          'border-green-500/30 bg-green-500/5': overallStatus.variant === 'success',
          'border-amber-500/30 bg-amber-500/5': overallStatus.variant === 'warning',
          'border-red-500/30 bg-red-500/5': overallStatus.variant === 'error',
        }"
      >
        <UIcon
          :name="overallStatus.variant === 'success' ? 'i-carbon-checkmark-filled' : overallStatus.variant === 'error' ? 'i-carbon-close-filled' : 'i-carbon-warning-filled'"
          class="text-lg"
          :class="{
            'text-green-500': overallStatus.variant === 'success',
            'text-amber-500': overallStatus.variant === 'warning',
            'text-red-500': overallStatus.variant === 'error',
          }"
        />
        <div>
          <p class="text-sm font-medium">
            {{ overallStatus.message }}
          </p>
          <p v-if="validation" class="text-xs text-[var(--ui-text-muted)]">
            {{ validation.summary.totalNodes }} nodes · {{ validation.summary.richResultNodes }} rich result eligible
          </p>
        </div>
      </div>

      <!-- Node Cards -->
      <UCard v-for="(node, index) in displayNodes" :key="index">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon :name="getSchemaIcon(getNodeType(node))" class="text-lg" />
              <span class="font-medium text-sm">{{ getNodeType(node) }}</span>
              <UBadge v-if="isRichResultType(getNodeType(node))" color="success" variant="subtle" size="xs">
                Rich Result
              </UBadge>
            </div>
            <div class="flex items-center gap-1">
              <button
                class="px-2 py-1 text-xs rounded"
                :class="getCardView(index) === 'validate' ? 'bg-[var(--ui-bg-elevated)] font-medium' : 'text-[var(--ui-text-muted)]'"
                @click="setCardView(index, 'validate')"
              >
                Validate
              </button>
              <button
                class="px-2 py-1 text-xs rounded"
                :class="getCardView(index) === 'json' ? 'bg-[var(--ui-bg-elevated)] font-medium' : 'text-[var(--ui-text-muted)]'"
                @click="setCardView(index, 'json')"
              >
                JSON
              </button>
            </div>
          </div>
          <p class="text-xs text-[var(--ui-text-muted)] mt-1 truncate">
            {{ getNodeDescription(node) }}
          </p>
        </template>

        <!-- Validate View -->
        <template v-if="getCardView(index) === 'validate'">
          <div v-if="googleRichResultsRequirements[getNodeType(node)]" class="space-y-4">
            <!-- Required Properties -->
            <div v-if="googleRichResultsRequirements[getNodeType(node)]?.required.length">
              <div class="text-xs font-semibold uppercase tracking-wider text-[var(--ui-text-muted)] mb-2">
                Required
              </div>
              <div class="space-y-0.5">
                <div
                  v-for="prop in googleRichResultsRequirements[getNodeType(node)].required"
                  :key="prop"
                  class="flex items-center gap-2 px-2 py-1.5 rounded-md"
                >
                  <UIcon
                    :name="getNestedProperty(node, prop) !== undefined ? 'i-carbon-checkmark-filled' : 'i-carbon-close-filled'"
                    class="text-sm shrink-0"
                    :class="getNestedProperty(node, prop) !== undefined ? 'text-green-500' : 'text-red-400'"
                  />
                  <span class="text-sm font-mono">{{ prop }}</span>
                  <span v-if="getNestedProperty(node, prop) !== undefined" class="text-xs text-[var(--ui-text-muted)] font-mono ml-auto truncate max-w-[200px]">
                    {{ formatPropertyValue(getNestedProperty(node, prop)) }}
                  </span>
                  <UBadge v-else color="error" variant="subtle" size="xs" class="ml-auto">
                    missing
                  </UBadge>
                </div>
              </div>
            </div>

            <!-- Recommended Properties -->
            <div v-if="googleRichResultsRequirements[getNodeType(node)]?.recommended.length">
              <details>
                <summary class="text-xs font-semibold uppercase tracking-wider text-[var(--ui-text-muted)] mb-2 cursor-pointer">
                  Recommended ({{ analyzeNodeProperties(node).missingRecommended.length }} missing)
                </summary>
                <div class="space-y-0.5 mt-2">
                  <div
                    v-for="prop in googleRichResultsRequirements[getNodeType(node)].recommended"
                    :key="prop"
                    class="flex items-center gap-2 px-2 py-1.5 rounded-md"
                  >
                    <UIcon
                      :name="getNestedProperty(node, prop) !== undefined ? 'i-carbon-checkmark-filled' : 'i-carbon-warning-filled'"
                      class="text-sm shrink-0"
                      :class="getNestedProperty(node, prop) !== undefined ? 'text-green-500' : 'text-amber-400'"
                    />
                    <span class="text-sm font-mono">{{ prop }}</span>
                    <span v-if="getNestedProperty(node, prop) !== undefined" class="text-xs text-[var(--ui-text-muted)] font-mono ml-auto truncate max-w-[200px]">
                      {{ formatPropertyValue(getNestedProperty(node, prop)) }}
                    </span>
                    <UBadge v-else color="warning" variant="subtle" size="xs" class="ml-auto">
                      missing
                    </UBadge>
                  </div>
                </div>
              </details>
            </div>

            <!-- Links -->
            <div class="flex gap-3 pt-2 border-t border-[var(--ui-border)]">
              <a :href="nodeToSchemaOrgLink(getNodeType(node)).schemaOrg" target="_blank" class="text-xs text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] flex items-center gap-1">
                <UIcon name="i-carbon-launch" class="text-xs" /> Schema.org
              </a>
              <a v-if="nodeToSchemaOrgLink(getNodeType(node)).googlePage" :href="nodeToSchemaOrgLink(getNodeType(node)).googlePage!" target="_blank" class="text-xs text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] flex items-center gap-1">
                <UIcon name="i-carbon-launch" class="text-xs" /> Google Docs
              </a>
            </div>
          </div>

          <p v-else class="text-xs text-[var(--ui-text-muted)]">
            No Google Rich Results requirements defined for this type.
          </p>
        </template>

        <!-- JSON View -->
        <template v-else>
          <pre class="text-xs font-mono overflow-auto leading-relaxed max-h-[400px]">{{ JSON.stringify(node, null, 2) }}</pre>
        </template>
      </UCard>

      <!-- External Tools -->
      <div class="flex gap-3 justify-center pt-2">
        <a href="https://validator.schema.org/" target="_blank" class="text-xs text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] flex items-center gap-1">
          <UIcon name="i-carbon-launch" /> Schema.org Validator
        </a>
        <a href="https://search.google.com/test/rich-results" target="_blank" class="text-xs text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] flex items-center gap-1">
          <UIcon name="i-carbon-launch" /> Google Rich Results Test
        </a>
      </div>
    </template>
  </div>
</template>
