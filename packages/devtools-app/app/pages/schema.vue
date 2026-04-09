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
} from '~/utils/schema-validation'

// Extract JSON-LD from script tags
const jsonLdData = computed(() => {
  const jsonLdTags = state.value.tags.filter(
    t => t.tag === 'script' && t.props?.type === 'application/ld+json',
  )
  if (!jsonLdTags.length)
    return null

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

// Extract only top-level @graph nodes (no recursive nesting)
const graphNodes = computed(() => {
  const data = jsonLdData.value
  if (!data)
    return []

  if (data['@graph'] && Array.isArray(data['@graph'])) {
    return data['@graph'].filter((node: any) => {
      if (!node || typeof node !== 'object')
        return false
      // Skip bare @id references
      if (Object.keys(node).length === 1 && node['@id'])
        return false
      return !!node['@type']
    })
  }

  if (data['@type'])
    return [data]

  return []
})

const richResultNodes = computed(() => graphNodes.value.filter((n: any) => isRichResultType(getNodeType(n))))

const validationSummary = computed(() => {
  let errors = 0
  let warnings = 0
  for (const node of richResultNodes.value) {
    const analysis = analyzeNodeProperties(node)
    errors += analysis.missingRequired.length
    warnings += analysis.missingRecommended.length
  }
  return { errors, warnings }
})
</script>

<template>
  <div class="space-y-4">
    <!-- No JSON-LD detected -->
    <DevtoolsEmptyState v-if="!jsonLdData" icon="i-carbon-chart-relationship" title="No structured data detected">
      <template #description>
        Add JSON-LD structured data via <code class="bg-elevated px-1.5 py-0.5 rounded text-xs">useSchemaOrg()</code> or <code class="bg-elevated px-1.5 py-0.5 rounded text-xs">useHead()</code> with a script tag.
      </template>
    </DevtoolsEmptyState>

    <template v-else>
      <!-- Summary -->
      <DevtoolsAlert
        v-if="validationSummary.errors > 0"
        variant="error"
      >
        <p class="font-medium">
          {{ validationSummary.errors }} missing required propert{{ validationSummary.errors > 1 ? 'ies' : 'y' }}
        </p>
      </DevtoolsAlert>

      <!-- Node Cards -->
      <UCard v-for="(node, index) in graphNodes" :key="index">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon :name="getSchemaIcon(getNodeType(node))" class="text-lg" />
            <span class="font-medium text-sm">{{ getNodeType(node) }}</span>
          </div>
          <p class="text-xs text-muted mt-1 truncate">
            {{ getNodeDescription(node) }}
          </p>
        </template>

        <!-- Validation for Google-supported types -->
        <div v-if="googleRichResultsRequirements[getNodeType(node)]" class="space-y-4">
          <!-- Required Properties -->
          <div v-if="googleRichResultsRequirements[getNodeType(node)]?.required.length">
            <div class="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              Required
            </div>
            <div class="space-y-0.5">
              <div
                v-for="prop in googleRichResultsRequirements[getNodeType(node)]!.required"
                :key="prop"
                class="flex items-center gap-2 px-2 py-1.5 rounded-md"
              >
                <UIcon
                  :name="getNestedProperty(node, prop) !== undefined ? 'i-carbon-checkmark-filled' : 'i-carbon-close-filled'"
                  class="text-sm shrink-0"
                  :class="getNestedProperty(node, prop) !== undefined ? 'text-green-500' : 'text-red-400'"
                />
                <span class="text-sm font-mono">{{ prop }}</span>
                <span v-if="getNestedProperty(node, prop) !== undefined" class="text-xs text-muted font-mono ml-auto truncate max-w-[200px]">
                  {{ formatPropertyValue(getNestedProperty(node, prop)) }}
                </span>
                <UBadge v-else color="error" variant="subtle" size="xs" class="ml-auto">
                  missing
                </UBadge>
              </div>
            </div>
          </div>

          <!-- Recommended Properties -->
          <DevtoolsSection
            v-if="googleRichResultsRequirements[getNodeType(node)]?.recommended.length"
            :open="false"
            icon="i-carbon-warning-filled"
            :text="`Recommended (${analyzeNodeProperties(node).missingRecommended.length} missing)`"
            :padding="false"
          >
            <div class="space-y-0.5 p-2">
              <div
                v-for="prop in googleRichResultsRequirements[getNodeType(node)]!.recommended"
                :key="prop"
                class="flex items-center gap-2 px-2 py-1.5 rounded-md"
              >
                <UIcon
                  :name="getNestedProperty(node, prop) !== undefined ? 'i-carbon-checkmark-filled' : 'i-carbon-warning-filled'"
                  class="text-sm shrink-0"
                  :class="getNestedProperty(node, prop) !== undefined ? 'text-green-500' : 'text-amber-400'"
                />
                <span class="text-sm font-mono">{{ prop }}</span>
                <span v-if="getNestedProperty(node, prop) !== undefined" class="text-xs text-muted font-mono ml-auto truncate max-w-[200px]">
                  {{ formatPropertyValue(getNestedProperty(node, prop)) }}
                </span>
                <UBadge v-else color="warning" variant="subtle" size="xs" class="ml-auto">
                  missing
                </UBadge>
              </div>
            </div>
          </DevtoolsSection>

          <!-- Links -->
          <div class="flex gap-3 pt-2 border-t border-default">
            <a :href="nodeToSchemaOrgLink(getNodeType(node)).schemaOrg" target="_blank" rel="noopener noreferrer" class="text-xs text-muted hover:text-default flex items-center gap-1">
              <UIcon name="i-carbon-launch" class="text-xs" /> Schema.org
            </a>
            <a v-if="nodeToSchemaOrgLink(getNodeType(node)).googlePage" :href="nodeToSchemaOrgLink(getNodeType(node)).googlePage!" target="_blank" rel="noopener noreferrer" class="text-xs text-muted hover:text-default flex items-center gap-1">
              <UIcon name="i-carbon-launch" class="text-xs" /> Google Docs
            </a>
          </div>
        </div>

        <!-- JSON for all nodes -->
        <div class="max-h-[400px] overflow-auto" :class="{ 'mt-4 pt-4 border-t border-default': googleRichResultsRequirements[getNodeType(node)] }">
          <OCodeBlock :code="JSON.stringify(node, null, 2)" lang="json" />
        </div>
      </UCard>

      <!-- External Tools -->
      <div class="flex gap-3 justify-center pt-2">
        <a href="https://validator.schema.org/" target="_blank" rel="noopener noreferrer" class="text-xs text-muted hover:text-default flex items-center gap-1">
          <UIcon name="i-carbon-launch" class="text-xs" /> Schema.org Validator
        </a>
        <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer" class="text-xs text-muted hover:text-default flex items-center gap-1">
          <UIcon name="i-carbon-launch" class="text-xs" /> Google Rich Results Test
        </a>
      </div>
    </template>
  </div>
</template>
