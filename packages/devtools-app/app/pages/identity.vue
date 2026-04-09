<script setup lang="ts">
import { isBrokenUrl } from '~/composables/link-checker'
import { state } from '~/composables/state'

const seo = computed(() => state.value.seo)

// Extract icons from tags
const icons = computed(() =>
  state.value.tags
    .filter(t => t.tag === 'link' && ['icon', 'apple-touch-icon'].includes(t.props?.rel || ''))
    .map(t => ({
      rel: t.props?.rel || 'icon',
      href: t.props?.href || '',
      type: t.props?.type,
      sizes: t.props?.sizes,
      media: t.props?.media,
    })),
)

const iconsByRel = computed(() => {
  const groups: Record<string, typeof icons.value> = {}
  for (const icon of icons.value) {
    const rel = icon.rel
    if (!groups[rel])
      groups[rel] = []
    groups[rel]!.push(icon)
  }
  return groups
})

const iconRelLabels: Record<string, { label: string, description: string }> = {
  'icon': { label: 'Favicon', description: 'Browser tab icons' },
  'apple-touch-icon': { label: 'Apple Touch Icon', description: 'iOS home screen icon' },
}

// Extract theme colors from tags
const themeColors = computed(() =>
  state.value.tags
    .filter(t => t.tag === 'meta' && t.props?.name === 'theme-color')
    .map((t) => {
      const media = t.props?.media || null
      let context: 'light' | 'dark' | 'default' = 'default'
      if (media?.includes('prefers-color-scheme: light'))
        context = 'light'
      else if (media?.includes('prefers-color-scheme: dark'))
        context = 'dark'
      return { color: t.props?.content || '', media, context }
    }),
)

// Color scheme meta
const colorScheme = computed(() => {
  const tag = state.value.tags.find(t => t.tag === 'meta' && t.props?.name === 'color-scheme')
  return tag?.props?.content || null
})

// Favicon for browser tab mockup
const faviconUrl = computed(() => {
  const ico = icons.value.find(i => i.href?.includes('favicon.ico'))
  if (ico)
    return ico.href
  return icons.value.find(i => i.rel === 'icon')?.href || null
})

// Language
const htmlLang = computed(() => {
  const tag = state.value.tags.find(t => t.tag === 'htmlAttrs')
  return tag?.props?.lang || null
})

// Checklist items: always visible, showing done/missing state
interface TipItem {
  done: boolean
  html: string
}

const browserChecklist = computed<TipItem[]>(() => [
  { done: !!seo.value.title, html: 'Set a <code>title</code> for the browser tab and search results.' },
  { done: !!seo.value.description, html: 'Add a <code>description</code> meta tag for search result snippets.' },
  { done: !!seo.value.canonical, html: 'Set a <code>canonical</code> URL so search engines know the preferred address.' },
  { done: !!htmlLang.value, html: `Set the <code>lang</code> attribute on <code>&lt;html&gt;</code> for accessibility.` },
])

const iconChecklist = computed<TipItem[]>(() => [
  { done: icons.value.some(i => i.rel === 'icon'), html: 'Add a <code>&lt;link rel="icon"&gt;</code> favicon.' },
  { done: icons.value.some(i => i.rel === 'apple-touch-icon'), html: 'Add an <code>apple-touch-icon</code> for iOS home screen.' },
  { done: icons.value.some(i => i.sizes), html: 'Specify <code>sizes</code> on icons for resolution hints.' },
])

const themeChecklist = computed<TipItem[]>(() => [
  { done: themeColors.value.length > 0, html: 'Set a <code>theme-color</code> to brand the mobile browser UI.' },
  {
    done: themeColors.value.some(tc => tc.context === 'light') && themeColors.value.some(tc => tc.context === 'dark'),
    html: 'Add light/dark <code>theme-color</code> variants with <code>prefers-color-scheme</code> media queries.',
  },
  { done: !!colorScheme.value, html: 'Set <code>color-scheme</code> to declare supported modes (e.g. <code>light dark</code>).' },
])
</script>

<template>
  <div class="space-y-4">
    <!-- Browser Tab Preview -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-carbon-application-web" class="text-lg" />
          <span class="font-medium">Browser Preview</span>
        </div>
      </template>

      <div class="id-browser" role="img" aria-label="Browser tab preview">
        <div class="id-browser__chrome">
          <div class="id-browser__dots" aria-hidden="true">
            <span /><span /><span />
          </div>
          <div class="id-browser__bar">
            <UIcon name="i-carbon-locked" class="id-browser__lock" />
            <span class="id-browser__url">{{ seo.canonical || 'localhost' }}</span>
          </div>
          <div class="id-browser__actions" aria-hidden="true">
            <span /><span /><span />
          </div>
        </div>
        <div class="id-browser__tabs">
          <div class="id-browser__tab id-browser__tab--active">
            <UIcon v-if="!faviconUrl || isBrokenUrl(faviconUrl)" name="i-carbon-earth" class="id-browser__favicon-placeholder" />
            <img v-else :src="faviconUrl" class="id-browser__favicon" alt="" width="14" height="14">
            <span class="id-browser__title">{{ seo.title || 'Untitled' }}</span>
          </div>
          <div class="id-browser__tab">
            <span class="id-browser__title text-muted/40">New Tab</span>
          </div>
        </div>
        <div class="id-browser__body" aria-hidden="true" />
      </div>

      <div class="mt-3 space-y-1">
        <DevtoolsTip v-for="(tip, i) in browserChecklist" :key="i" :done="tip.done" :html="tip.html" />
      </div>
    </UCard>

    <!-- Icons -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-carbon-image" class="text-lg" />
            <span class="font-medium">Icons</span>
          </div>
          <UBadge v-if="icons.length" variant="subtle" size="xs" color="neutral">
            {{ icons.length }}
          </UBadge>
        </div>
      </template>

      <template v-if="icons.length">
        <div v-for="(groupIcons, rel) in iconsByRel" :key="rel" class="mb-5 last:mb-0">
          <div class="id-group-header">
            <span>{{ iconRelLabels[rel]?.label || rel }}</span>
            <span class="id-group-count">{{ groupIcons.length }}</span>
          </div>
          <p class="text-xs text-muted mb-3">
            {{ iconRelLabels[rel]?.description || '' }}
          </p>
          <div class="id-icon-grid">
            <div
              v-for="(icon, index) in groupIcons"
              :key="`${icon.rel}:${icon.href}:${icon.sizes || ''}:${icon.type || ''}:${index}`"
              class="id-icon-card"
              :class="{ 'id-icon-card--broken': isBrokenUrl(icon.href) }"
            >
              <div class="id-icon-preview">
                <template v-if="isBrokenUrl(icon.href)">
                  <UIcon name="i-carbon-warning-filled" class="text-red-400 text-lg" />
                </template>
                <img v-else :src="icon.href" :alt="icon.rel" class="id-icon-img" width="32" height="32" loading="lazy">
              </div>
              <div class="id-icon-meta">
                <p class="text-xs font-mono truncate" :class="isBrokenUrl(icon.href) ? 'text-red-400' : 'text-muted'">
                  {{ icon.href }}
                </p>
                <div class="id-icon-badges">
                  <UBadge v-if="isBrokenUrl(icon.href)" color="error" variant="subtle" size="xs">
                    Broken
                  </UBadge>
                  <UBadge v-if="icon.sizes" variant="subtle" size="xs">
                    {{ icon.sizes }}
                  </UBadge>
                  <UBadge v-if="icon.type" variant="subtle" size="xs" color="neutral">
                    {{ icon.type }}
                  </UBadge>
                  <UBadge v-if="icon.media" variant="subtle" size="xs" color="info">
                    {{ icon.media.includes('dark') ? 'Dark' : icon.media.includes('light') ? 'Light' : icon.media }}
                  </UBadge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <DevtoolsEmptyState v-if="!icons.length" icon="i-carbon-image" title="No favicons detected">
        <template #description>
          Add a <code class="bg-elevated px-1.5 py-0.5 rounded text-xs">&lt;link rel="icon"&gt;</code> tag via <code class="bg-elevated px-1.5 py-0.5 rounded text-xs">useHead()</code> to set your favicon.
        </template>
      </DevtoolsEmptyState>

      <div class="space-y-1" :class="icons.length ? 'mt-4' : 'mt-2'">
        <DevtoolsTip v-for="(tip, i) in iconChecklist" :key="i" :done="tip.done" :html="tip.html" />
      </div>
    </UCard>

    <!-- Theme Colors -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-carbon-color-palette" class="text-lg" />
            <span class="font-medium">Theme Colors</span>
          </div>
          <UBadge v-if="themeColors.length" variant="subtle" size="xs" color="neutral">
            {{ themeColors.length }}
          </UBadge>
        </div>
      </template>

      <!-- Color Scheme -->
      <div v-if="colorScheme" class="mb-5">
        <div class="id-group-header">
          <span>Color Scheme</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-6 rounded border border-default" style="background: linear-gradient(90deg, #fff 50%, #1a1a1a 50%)" aria-hidden="true" />
          <div>
            <span class="text-sm font-mono font-medium">{{ colorScheme }}</span>
            <p class="text-xs text-muted">
              Supported color schemes for system preferences
            </p>
          </div>
        </div>
      </div>

      <!-- Theme Color Swatches -->
      <div v-if="themeColors.length">
        <div class="id-group-header">
          <span>Theme Colors</span>
        </div>
        <div class="id-color-grid">
          <div v-for="(tc, i) in themeColors" :key="i" class="id-color-card">
            <div
              class="id-color-card__swatch"
              role="img"
              :aria-label="`Color swatch: ${tc.color}`"
              :style="{ backgroundColor: tc.color }"
            />
            <div class="id-color-card__meta">
              <span class="text-sm font-mono font-medium">{{ tc.color }}</span>
              <UBadge v-if="tc.context !== 'default'" variant="subtle" size="xs">
                {{ tc.context }}
              </UBadge>
            </div>
          </div>
        </div>
      </div>

      <DevtoolsEmptyState v-if="!themeColors.length && !colorScheme" icon="i-carbon-color-palette" title="No theme colors set">
        <template #description>
          Theme colors customize the browser chrome and mobile status bar.
        </template>
      </DevtoolsEmptyState>

      <div class="space-y-1" :class="(themeColors.length || colorScheme) ? 'mt-4' : 'mt-2'">
        <DevtoolsTip v-for="(tip, i) in themeChecklist" :key="i" :done="tip.done" :html="tip.html" />
      </div>
    </UCard>
  </div>
</template>

<style scoped>
/* Browser mockup */
.id-browser {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--ui-border);
}
.id-browser__chrome {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--ui-bg-muted);
}
.id-browser__dots {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}
.id-browser__dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.id-browser__dots span:nth-child(1) { background: oklch(65% 0.2 25); }
.id-browser__dots span:nth-child(2) { background: oklch(80% 0.15 85); }
.id-browser__dots span:nth-child(3) { background: oklch(70% 0.15 145); }
.id-browser__bar {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex: 1;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
}
.id-browser__lock {
  width: 12px;
  height: 12px;
  color: var(--ui-text-muted);
  flex-shrink: 0;
}
.id-browser__url {
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  color: var(--ui-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.id-browser__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.id-browser__actions span {
  width: 14px;
  height: 2px;
  border-radius: 1px;
  background: var(--ui-border);
}
.id-browser__tabs {
  display: flex;
  align-items: stretch;
  background: var(--ui-bg-muted);
  border-bottom: 1px solid var(--ui-border);
  padding: 0 0.5rem;
  gap: 1px;
}
.id-browser__tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  max-width: 180px;
  border-radius: 8px 8px 0 0;
  margin-bottom: -1px;
  border: 1px solid transparent;
  border-bottom: none;
}
.id-browser__tab--active {
  background: var(--ui-bg-elevated);
  border-color: var(--ui-border);
}
.id-browser__body {
  height: 32px;
  background: var(--ui-bg-elevated);
}
.id-browser__favicon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  object-fit: contain;
}
.id-browser__favicon-placeholder {
  width: 14px;
  height: 14px;
  color: var(--ui-text-muted);
  flex-shrink: 0;
}
.id-browser__title {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--ui-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Group Headers */
.id-group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.625rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid var(--ui-border);
}
.id-group-header span {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ui-text-muted);
}
.id-group-count {
  font-family: var(--font-mono) !important;
  font-size: 0.625rem !important;
  font-weight: 500 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  padding: 0 0.375rem;
  border-radius: 9999px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
}

/* Icon Grid */
.id-icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
}
.id-icon-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg-elevated);
}
.id-icon-card--broken {
  border-color: oklch(65% 0.2 25 / 0.3);
  background: oklch(65% 0.2 25 / 0.04);
}
.id-icon-preview {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--ui-border);
  background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
  flex-shrink: 0;
}
.id-icon-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}
.id-icon-meta {
  min-width: 0;
  flex: 1;
}
.id-icon-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

/* Color Grid */
.id-color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
}
.id-color-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem;
  border-radius: 8px;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg-elevated);
}
.id-color-card__swatch {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid var(--ui-border);
  flex-shrink: 0;
}
.id-color-card__meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
</style>
