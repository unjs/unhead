<script setup lang="ts">
import type { SerializedTag } from '~/composables/state'
import { brokenLinks, isBrokenUrl } from '~/composables/link-checker'
import { state } from '~/composables/state'

const { tags, title = 'Tags', icon = 'i-carbon-tag-group' } = defineProps<{
  tags: SerializedTag[]
  title?: string
  icon?: string
}>()

const tagFilter = ref('')
const activeTagType = ref<string | null>(null)
const activeSource = ref<string | null>(null)

const tagTypeColors: Record<string, string> = {
  meta: 'info',
  link: 'success',
  title: 'primary',
  script: 'error',
  htmlAttrs: 'warning',
  titleTemplate: 'neutral',
  templateParams: 'neutral',
}

function tagTypeColor(tag: string) {
  return (tagTypeColors[tag] || 'neutral') as 'info' | 'success' | 'primary' | 'error' | 'warning' | 'neutral'
}

const tagTypeCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const t of tags) {
    counts[t.tag] = (counts[t.tag] || 0) + 1
  }
  return counts
})

const singletonTags = new Set(['title', 'titleTemplate', 'templateParams', 'htmlAttrs', 'bodyAttrs'])

const filteredTags = computed(() => {
  let result = tags
  if (activeTagType.value)
    result = result.filter(t => t.tag === activeTagType.value)
  if (activeSource.value)
    result = result.filter(t => (t.source || '') === activeSource.value)
  const filter = tagFilter.value.toLowerCase()
  if (!filter)
    return result
  return result.filter((t) => {
    const name = t.props?.name || t.props?.property || t.props?.rel || t.props?.src || ''
    return t.tag.includes(filter) || name.toLowerCase().includes(filter) || (t.source || '').toLowerCase().includes(filter)
  })
})

function toggleSource(source: string) {
  activeSource.value = activeSource.value === source ? null : source
}

function toggleTagType(tag: string) {
  activeTagType.value = activeTagType.value === tag ? null : tag
}

// Merge server validation rules with client-side broken link checks
const validationRules = computed(() => {
  const rules = [...(state.value.validationRules || [])]
  for (const broken of brokenLinks.value.values()) {
    rules.push({
      id: 'broken-link',
      message: `${broken.identifier} URL is broken or unreachable: ${broken.url}`,
      severity: 'warn',
      tagDedupeKey: broken.tagDedupeKey,
    })
  }
  return rules
})

const URL_SUFFIX_RE = /:\s+(https?:\/\/\S+|\/\S+)$/
const colorRe = /^#(?:[0-9a-f]{3,4}){1,2}$|^rgba?\([\d\s,./]+\)$|^hsla?\([\d\s%,./]+\)$/i
const imageExtRe = /\.(?:png|jpe?g|gif|svg|ico|webp|avif)(?:\?.*)?$/i
const OG_IMAGE_RE = /^og:image|twitter:image/
const ICON_REL_RE = /icon|apple-touch-icon/

function tagMatchKey(tag: any): string {
  return tag.dedupeKey || tag._h || `${tag.tag}:${JSON.stringify(tag.props || {})}`
}

const warningsByTag = computed(() => {
  const byKey = new Map<string, typeof validationRules.value>()
  const byUrl = new Map<string, typeof validationRules.value>()
  for (const rule of validationRules.value) {
    if (rule.tagDedupeKey) {
      const existing = byKey.get(rule.tagDedupeKey) || []
      existing.push(rule)
      byKey.set(rule.tagDedupeKey, existing)
    }
    if (rule.id === 'broken-link') {
      const urlMatch = rule.message.match(URL_SUFFIX_RE) as RegExpMatchArray | null
      if (urlMatch?.[1]) {
        const existing = byUrl.get(urlMatch[1]) || []
        existing.push(rule)
        byUrl.set(urlMatch[1], existing)
      }
    }
  }
  return { byKey, byUrl }
})

function tagWarnings(tag: any) {
  const { byKey, byUrl } = warningsByTag.value
  const byKeyResult = byKey.get(tagMatchKey(tag)) || []
  const url = tagUrl(tag) || tagValue(tag)
  const byUrlResult = url ? (byUrl.get(url) || []) : []
  if (!byKeyResult.length)
    return byUrlResult
  if (!byUrlResult.length)
    return byKeyResult
  const seen = new Set(byKeyResult)
  return [...byKeyResult, ...byUrlResult.filter(r => !seen.has(r))]
}

function tagIdentifier(tag: any): string {
  if (tag.tag === 'meta') {
    if (tag.props?.name)
      return tag.props.name
    if (tag.props?.property)
      return tag.props.property
    if (tag.props?.charset)
      return 'charset'
    if (tag.props?.['http-equiv'])
      return tag.props['http-equiv']
    return '-'
  }
  if (tag.tag === 'link')
    return tag.props?.rel || '-'
  if (tag.tag === 'script')
    return tag.props?.src || '(inline)'
  if (tag.tag === 'title' || tag.tag === 'titleTemplate')
    return '-'
  if (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs')
    return '-'
  return '-'
}

function tagValue(tag: any): string {
  if (tag.tag === 'meta') {
    if (tag.props?.content)
      return tag.props.content
    if (tag.props?.charset)
      return tag.props.charset
    return ''
  }
  if (tag.tag === 'title' || tag.tag === 'titleTemplate')
    return tag.textContent || ''
  if (tag.tag === 'link')
    return tag.props?.href || ''
  if (tag.tag === 'script')
    return tag.props?.src || '(inline)'
  if (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs') {
    const attrs = Object.entries(tag.props || {}).map(([k, v]) => v === true ? k : `${k}="${v}"`).join(' ')
    return attrs || ''
  }
  return ''
}

function isColorValue(tag: any): string | false {
  if (tag.tag === 'meta' && (tag.props?.name === 'theme-color' || tag.props?.name === 'msapplication-TileColor')) {
    const v = tag.props?.content
    if (v && colorRe.test(v.trim()))
      return v.trim()
  }
  return false
}

function tagUrl(tag: any): string | false {
  if (tag.tag === 'meta' && tag.props?.content?.startsWith('http'))
    return tag.props.content
  if (tag.tag === 'link' && tag.props?.href?.startsWith('http'))
    return tag.props.href
  if (tag.tag === 'script' && tag.props?.src?.startsWith('http'))
    return tag.props.src
  return false
}

function isImageUrl(tag: any): string | false {
  const val = tagValue(tag)
  if (!val)
    return false
  if (tag.tag === 'meta' && OG_IMAGE_RE.test(tag.props?.property || tag.props?.name || ''))
    return val
  if (tag.tag === 'link' && ICON_REL_RE.test(tag.props?.rel || '') && val)
    return val
  if (imageExtRe.test(val))
    return val
  return false
}

function hasInlineCode(tag: any): false | { code: string, lang: 'js' | 'json' | 'xml' | 'css' } {
  if (tag.tag === 'script' && tag.innerHTML && !tag.props?.src)
    return { code: tag.innerHTML, lang: tag.props?.type === 'application/ld+json' ? 'json' : 'js' }
  if (tag.tag === 'style' && tag.innerHTML)
    return { code: tag.innerHTML, lang: 'css' }
  return false
}

const expandedRows = ref(new Set<string>())

function toggleRow(tag: any) {
  const key = tagMatchKey(tag)
  if (expandedRows.value.has(key))
    expandedRows.value.delete(key)
  else
    expandedRows.value.add(key)
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon :name="icon" class="text-lg" />
            <span class="font-medium">{{ title }} ({{ filteredTags.length }}<template v-if="activeTagType || activeSource || tagFilter"> / {{ tags.length }}</template>)</span>
            <button v-if="activeSource" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-elevated border border-default hover:bg-muted transition-colors" @click="activeSource = null">
              source: {{ activeSource }}
              <UIcon name="i-carbon-close" class="text-xs" />
            </button>
          </div>
          <slot name="actions" />
        </div>
      </div>
    </template>
    <div class="overflow-auto max-h-[400px]">
      <div class="mb-3 flex gap-3">
        <UInput v-model="tagFilter" placeholder="Filter tags…" aria-label="Filter tags" name="tag-filter" autocomplete="off" size="xs" class="w-48" />
        <div v-if="Object.keys(tagTypeCounts).length > 1" class="flex flex-wrap gap-2" role="group" aria-label="Filter by tag type">
          <button
            v-for="(count, tag) in tagTypeCounts"
            :key="tag"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors duration-150 border"
            :class="activeTagType === tag
              ? 'tag-filter-active border-current'
              : 'tag-filter border-transparent hover:border-current'"
            :data-color="tagTypeColor(tag as string)"
            :aria-pressed="activeTagType === tag"
            @click="toggleTagType(tag as string)"
          >
            <span class="tag-filter-dot" />
            <template v-if="singletonTags.has(tag as string)">
              {{ tag }}
            </template>
            <template v-else>
              {{ count }} {{ tag }}
            </template>
          </button>
        </div>
      </div>
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-default">
          <tr class="text-left text-muted border-b border-default">
            <th scope="col" class="p-2 w-20">
              Tag
            </th>
            <th scope="col" class="p-2">
              Identifier
            </th>
            <th scope="col" class="p-2">
              Value
            </th>
            <th scope="col" class="p-2">
              Source
            </th>
            <th scope="col" class="p-2 w-24">
              Mode
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="tag in filteredTags" :key="tagMatchKey(tag)">
            <tr
              class="border-b border-default hover:bg-elevated transition-colors cursor-pointer"
              :class="{ 'bg-elevated/30': expandedRows.has(tagMatchKey(tag)) }"
              @click="toggleRow(tag)"
            >
              <td class="p-2">
                <div class="flex items-center gap-1.5">
                  <UIcon
                    name="i-carbon-chevron-right"
                    class="text-xs text-muted shrink-0 transition-transform duration-150"
                    :class="{ 'rotate-90': expandedRows.has(tagMatchKey(tag)) }"
                  />
                  <UBadge :color="tagTypeColor(tag.tag)" variant="subtle" size="xs">
                    {{ tag.tag }}
                  </UBadge>
                </div>
              </td>
              <td class="p-2 font-mono text-xs">
                {{ tagIdentifier(tag) }}
              </td>
              <td class="p-2 font-mono text-xs max-w-[300px]">
                <div class="flex items-center gap-1.5">
                  <UIcon
                    v-if="tagWarnings(tag).some(r => r.id === 'broken-link')"
                    name="i-carbon-error-filled"
                    class="text-red-500 text-sm shrink-0"
                  />
                  <UIcon
                    v-else-if="tagWarnings(tag).length"
                    name="i-carbon-warning-filled"
                    class="text-amber-500 text-sm shrink-0"
                  />
                  <span
                    v-if="isColorValue(tag)"
                    class="inline-block w-3 h-3 rounded-sm shrink-0 border border-default"
                    :style="{ background: isColorValue(tag) as string }"
                  />
                  <UIcon
                    v-if="isImageUrl(tag)"
                    name="i-carbon-image"
                    class="text-muted text-sm shrink-0"
                  />
                  <span class="truncate" :class="{ 'line-through text-red-400/70': (tagUrl(tag) && isBrokenUrl(tagUrl(tag) as string)) || isBrokenUrl(tagValue(tag)) }">{{ tagValue(tag) }}</span>
                </div>
              </td>
              <td class="p-2 font-mono text-xs text-muted">
                <button v-if="tag.source" class="hover:text-default hover:underline transition-colors cursor-pointer" :class="{ 'text-default font-medium': activeSource === tag.source }" @click.stop="toggleSource(tag.source!)">
                  {{ tag.source }}
                </button>
              </td>
              <td class="p-2">
                <UBadge
                  :color="tag.mode === 'server' ? 'info'
                    : tag.mode === 'client' ? 'warning'
                      : tag.mode === 'stream' ? 'primary'
                        : 'success'"
                  variant="subtle"
                  size="xs"
                >
                  {{ tag.mode }}
                </UBadge>
              </td>
            </tr>
            <tr v-if="expandedRows.has(tagMatchKey(tag))" class="border-b border-default">
              <td colspan="5" class="px-4 py-3 bg-elevated/50">
                <div class="space-y-3">
                  <!-- Warnings -->
                  <div v-if="tagWarnings(tag).length" class="space-y-1">
                    <div
                      v-for="(rule, j) in tagWarnings(tag)" :key="j"
                      class="flex items-start gap-2 py-1 px-2 rounded-md"
                      :class="rule.id === 'broken-link' ? 'bg-red-500/5' : rule.severity === 'warn' ? 'bg-amber-500/5' : 'bg-blue-500/5'"
                    >
                      <UIcon
                        :name="rule.id === 'broken-link' ? 'i-carbon-error-filled' : rule.severity === 'warn' ? 'i-carbon-warning-filled' : 'i-carbon-information-filled'"
                        class="text-sm mt-0.5 shrink-0"
                        :class="rule.id === 'broken-link' ? 'text-red-500' : rule.severity === 'warn' ? 'text-amber-500' : 'text-blue-400'"
                      />
                      <div class="min-w-0">
                        <span class="text-xs font-mono">{{ rule.id }}</span>
                        <p class="text-xs text-muted">
                          {{ rule.message }}
                        </p>
                      </div>
                    </div>
                  </div>
                  <!-- Image preview -->
                  <div v-if="isImageUrl(tag)" class="tag-image-preview">
                    <img
                      :src="isImageUrl(tag) as string"
                      :alt="tagIdentifier(tag)"
                      class="max-w-full max-h-40 rounded border border-default object-contain bg-elevated"
                      loading="lazy"
                      @error="($event.target as HTMLImageElement).style.display = 'none'"
                    >
                  </div>
                  <!-- Inline code -->
                  <DevtoolsSnippet
                    v-if="hasInlineCode(tag)"
                    :label="tag.tag === 'script' ? (tag.props?.type || 'text/javascript') : 'text/css'"
                    :code="(hasInlineCode(tag) as { code: string, lang: 'js' | 'json' | 'xml' | 'css' }).code"
                    :lang="(hasInlineCode(tag) as { code: string, lang: 'js' | 'json' | 'xml' | 'css' }).lang"
                  />
                  <!-- Tag details -->
                  <DevtoolsKeyValue
                    :items="[
                      ...Object.entries(tag.props || {}).map(([k, v]) => ({ key: k, value: String(v), mono: true })),
                      ...(tag.textContent ? [{ key: 'textContent', value: tag.textContent, mono: true }] : []),
                      ...(tag.innerHTML && !hasInlineCode(tag) ? [{ key: 'innerHTML', value: tag.innerHTML, mono: true }] : []),
                      ...(tag.dedupeKey ? [{ key: 'dedupeKey', value: tag.dedupeKey, mono: true }] : []),
                      ...(tag.position ? [{ key: 'position', value: tag.position, mono: true }] : []),
                      ...(tag.priority != null ? [{ key: 'priority', value: String(tag.priority), mono: true }] : []),
                    ]"
                  />
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <DevtoolsEmptyState v-if="!filteredTags.length" icon="i-carbon-tag-group" title="No tags found" description="Try adjusting your filter." />
    </div>
  </UCard>
</template>

<style scoped>
.tag-filter-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.6;
}

/* Color mapping via data attribute */
.tag-filter[data-color="info"],
.tag-filter-active[data-color="info"] { color: var(--ui-text-secondary); }
.tag-filter[data-color="success"],
.tag-filter-active[data-color="success"] { color: oklch(65% 0.2 145); }
.tag-filter[data-color="primary"],
.tag-filter-active[data-color="primary"] { color: var(--ui-color-primary); }
.tag-filter[data-color="error"],
.tag-filter-active[data-color="error"] { color: oklch(62% 0.2 25); }
.tag-filter[data-color="warning"],
.tag-filter-active[data-color="warning"] { color: oklch(70% 0.18 80); }
.tag-filter[data-color="neutral"],
.tag-filter-active[data-color="neutral"] { color: var(--ui-text-muted); }

.tag-filter {
  background: transparent;
  opacity: 0.7;
}
.tag-filter:hover {
  opacity: 1;
  background: color-mix(in oklch, currentColor 6%, transparent);
}
.tag-filter-active {
  opacity: 1;
  background: color-mix(in oklch, currentColor 10%, transparent);
}
.tag-filter-active .tag-filter-dot {
  opacity: 1;
}
.tag-image-preview {
  padding: 0.25rem;
}
</style>
