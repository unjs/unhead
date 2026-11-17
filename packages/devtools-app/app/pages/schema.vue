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
  hasPropertyValue,
  isRichResultType,
  nodeToSchemaOrgLink,
} from '~/utils/schema-validation'

// Parse every JSON-LD script: a page can emit Organization, WebSite and
// BreadcrumbList as separate scripts.
const jsonLdDocs = computed(() => state.value.tags
  .filter(t => t.tag === 'script' && t.props?.type === 'application/ld+json')
  .flatMap((tag) => {
    try {
      return [JSON.parse(tag.innerHTML || '{}')]
    }
    catch {
      // Malformed JSON-LD has no nodes to list; the Tags tab still shows the raw script.
      return []
    }
  }))

function isTypedNode(node: any): boolean {
  return !!node && typeof node === 'object' && !!node['@type']
}

// Top-level nodes only (no recursive nesting). Bare @id references have no @type.
function topLevelNodes(doc: any): any[] {
  if (Array.isArray(doc))
    return doc.flatMap(topLevelNodes)
  if (doc && Array.isArray(doc['@graph']))
    return doc['@graph'].filter(isTypedNode)
  return isTypedNode(doc) ? [doc] : []
}

const graphNodes = computed(() => jsonLdDocs.value.flatMap(topLevelNodes))

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
    <DevtoolsEmptyState v-if="!graphNodes.length" icon="i-carbon-chart-relationship" title="No structured data detected">
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
      <DevtoolsAlert
        v-else-if="validationSummary.warnings > 0"
        variant="warning"
      >
        <p class="font-medium">
          {{ validationSummary.warnings }} missing recommended propert{{ validationSummary.warnings > 1 ? 'ies' : 'y' }}
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
                  :name="hasPropertyValue(node, prop) ? 'i-carbon-checkmark-filled' : 'i-carbon-close-filled'"
                  class="text-sm shrink-0"
                  :class="hasPropertyValue(node, prop) ? 'text-green-500' : 'text-red-400'"
                />
                <span class="text-sm font-mono">{{ prop }}</span>
                <span v-if="hasPropertyValue(node, prop)" class="text-xs text-muted font-mono ml-auto truncate max-w-[200px]">
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
                  :name="hasPropertyValue(node, prop) ? 'i-carbon-checkmark-filled' : 'i-carbon-warning-filled'"
                  class="text-sm shrink-0"
                  :class="hasPropertyValue(node, prop) ? 'text-green-500' : 'text-amber-400'"
                />
                <span class="text-sm font-mono">{{ prop }}</span>
                <span v-if="hasPropertyValue(node, prop)" class="text-xs text-muted font-mono ml-auto truncate max-w-[200px]">
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
