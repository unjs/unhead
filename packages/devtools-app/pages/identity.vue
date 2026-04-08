<script setup lang="ts">
import { state } from '~/composables/state'

const seo = computed(() => state.value.seo)

// Extract icons from tags
const icons = computed(() =>
  state.value.tags
    .filter(t => t.tag === 'link' && ['icon', 'apple-touch-icon'].includes(t.props?.rel))
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

// Identity score
const identityChecks = computed(() => [
  { name: 'Title', ok: !!seo.value.title },
  { name: 'Description', ok: !!seo.value.description },
  { name: 'Favicon', ok: icons.value.length > 0 },
  { name: 'og:title', ok: !!seo.value.ogTitle },
  { name: 'og:image', ok: !!seo.value.ogImage },
  { name: 'Theme color', ok: themeColors.value.length > 0 },
])

const scorePresent = computed(() => identityChecks.value.filter(c => c.ok).length)
const scoreTotal = computed(() => identityChecks.value.length)
const scorePercent = computed(() => scoreTotal.value > 0 ? Math.round((scorePresent.value / scoreTotal.value) * 100) : 0)
const scoreVariant = computed(() => scorePercent.value >= 80 ? 'success' : 'warning')

// Social preview
const previewTitle = computed(() => seo.value.ogTitle || seo.value.title || 'Untitled')
const previewDescription = computed(() => seo.value.ogDescription || seo.value.description || '')
const previewImage = computed(() => seo.value.ogImage || null)

const activePreview = ref('twitter')
const previewTabs = [
  { label: 'X / Twitter', value: 'twitter', icon: 'i-carbon-logo-x' },
  { label: 'Facebook', value: 'facebook', icon: 'i-carbon-logo-facebook' },
  { label: 'LinkedIn', value: 'linkedin', icon: 'i-carbon-logo-linkedin' },
  { label: 'Discord', value: 'discord', icon: 'i-carbon-logo-discord' },
]
</script>

<template>
  <div class="space-y-5">
    <!-- Hero: Identity Score + Browser Tab Mockup -->
    <div class="id-hero" :class="`id-hero--${scoreVariant}`">
      <div class="flex items-center gap-4">
        <!-- Score ring -->
        <div class="id-score-ring">
          <svg viewBox="0 0 36 36" class="id-score-ring__svg">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--ui-border)" stroke-width="2.5" />
            <circle
              cx="18" cy="18" r="15.5" fill="none"
              class="id-score-ring__progress"
              :class="`id-score-ring__progress--${scoreVariant}`"
              stroke-width="2.5"
              stroke-linecap="round"
              :stroke-dasharray="`${scorePercent * 0.974}, 100`"
              transform="rotate(-90 18 18)"
            />
          </svg>
          <span class="id-score-ring__text">{{ scorePresent }}<span class="opacity-35 mx-px">/</span>{{ scoreTotal }}</span>
        </div>
        <div>
          <p class="font-medium text-sm">
            {{ scorePercent >= 80 ? 'Identity configured' : 'Needs setup' }}
          </p>
          <p class="text-xs text-muted">
            {{ scorePresent }} of {{ scoreTotal }} identity checks passing
          </p>
        </div>
      </div>

      <!-- Mini browser tab mockup -->
      <div class="id-browser-tab">
        <div class="id-browser-tab__chrome">
          <div class="id-browser-tab__dots">
            <span /><span /><span />
          </div>
          <div class="id-browser-tab__tab">
            <img v-if="faviconUrl" :src="faviconUrl" class="w-3.5 h-3.5 rounded-sm" alt="">
            <UIcon v-else name="i-carbon-earth" class="text-xs text-muted" />
            <span class="text-xs truncate max-w-[120px]">{{ seo.title || 'Untitled' }}</span>
          </div>
        </div>
        <div class="id-browser-tab__bar">
          <UIcon name="i-carbon-locked" class="text-[10px] text-muted" />
          <span class="text-[11px] text-muted font-mono truncate">{{ seo.canonical || 'localhost' }}</span>
        </div>
      </div>
    </div>

    <!-- Identity Checklist -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-carbon-task" class="text-lg" />
          <span class="font-medium">Identity Checklist</span>
        </div>
      </template>
      <div class="space-y-0.5">
        <div v-for="check in identityChecks" :key="check.name" class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-elevated transition-colors">
          <UIcon
            :name="check.ok ? 'i-carbon-checkmark-filled' : 'i-carbon-close-filled'"
            class="text-sm shrink-0"
            :class="check.ok ? 'text-green-500' : 'text-red-400'"
          />
          <span class="text-sm">{{ check.name }}</span>
        </div>
      </div>
    </UCard>

    <!-- Icons -->
    <UCard v-if="icons.length">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-carbon-image" class="text-lg" />
            <span class="font-medium">Icons ({{ icons.length }})</span>
          </div>
        </div>
      </template>
      <div v-for="(groupIcons, rel) in iconsByRel" :key="rel" class="mb-4 last:mb-0">
        <div class="text-xs font-semibold uppercase tracking-wider text-muted mb-2 pb-1 border-b border-default">
          {{ iconRelLabels[rel]?.label || rel }}
          <span class="font-normal normal-case tracking-normal ml-1">{{ iconRelLabels[rel]?.description || '' }}</span>
        </div>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          <div v-for="icon in groupIcons" :key="icon.href" class="flex items-center gap-3 p-3 rounded-lg border border-default bg-elevated">
            <div class="w-10 h-10 rounded-md flex items-center justify-center bg-default border border-default" style="background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%); background-size: 8px 8px; background-position: 0 0, 0 4px, 4px -4px, -4px 0px;">
              <img :src="icon.href" :alt="icon.rel" class="w-8 h-8 object-contain">
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-mono truncate text-muted">
                {{ icon.href }}
              </p>
              <div class="flex flex-wrap gap-1 mt-1">
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
    </UCard>

    <!-- Theme Colors -->
    <UCard v-if="themeColors.length || colorScheme">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-carbon-color-palette" class="text-lg" />
          <span class="font-medium">Theme Colors</span>
        </div>
      </template>
      <div class="space-y-4">
        <div v-if="colorScheme" class="flex items-center gap-3">
          <div class="w-10 h-6 rounded border border-default" style="background: linear-gradient(90deg, #fff 50%, #1a1a1a 50%)" />
          <div>
            <span class="text-sm font-mono">{{ colorScheme }}</span>
            <p class="text-xs text-muted">
              Color scheme preference
            </p>
          </div>
        </div>
        <div v-for="(tc, i) in themeColors" :key="i" class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg border border-default"
            :style="{ backgroundColor: tc.color }"
          />
          <div>
            <span class="text-sm font-mono font-medium">{{ tc.color }}</span>
            <div class="flex gap-1 mt-0.5">
              <UBadge v-if="tc.context !== 'default'" variant="subtle" size="xs">
                {{ tc.context }}
              </UBadge>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Open Graph -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-carbon-tag-group" class="text-lg" />
          <span class="font-medium">Open Graph</span>
        </div>
      </template>
      <div class="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
        <span class="text-muted">og:title</span>
        <span class="font-mono text-xs truncate">{{ seo.ogTitle || seo.title || '(not set)' }}</span>

        <span class="text-muted">og:description</span>
        <span class="font-mono text-xs truncate">{{ seo.ogDescription || '(not set)' }}</span>

        <span class="text-muted">og:image</span>
        <span class="font-mono text-xs truncate">{{ seo.ogImage || '(not set)' }}</span>
      </div>
      <div v-if="seo.ogImage" class="mt-3 rounded-lg overflow-hidden border border-default">
        <img :src="seo.ogImage" class="w-full max-h-48 object-contain bg-neutral-100 dark:bg-neutral-800" alt="og:image preview">
      </div>
    </UCard>

    <!-- Social Previews -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-carbon-share" class="text-lg" />
          <span class="font-medium">Social Preview</span>
        </div>
      </template>
      <div class="id-social-tab-bar">
        <button
          v-for="tab of previewTabs"
          :key="tab.value"
          class="id-social-tab"
          :class="{ 'id-social-tab--active': activePreview === tab.value }"
          @click="activePreview = tab.value"
        >
          <UIcon :name="tab.icon" class="text-sm" />
          <span class="hidden sm:inline">{{ tab.label }}</span>
        </button>
      </div>

      <div class="p-4">
        <!-- Twitter -->
        <div v-if="activePreview === 'twitter'" class="max-w-[500px] mx-auto">
          <div class="rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
            <div v-if="previewImage" class="aspect-[1.91/1] bg-neutral-100 dark:bg-neutral-800">
              <img :src="previewImage" class="w-full h-full object-cover" :alt="previewTitle">
            </div>
            <div v-else class="id-image-placeholder aspect-[1.91/1]">
              <UIcon name="i-carbon-image" class="text-2xl" />
              <span>No og:image</span>
            </div>
            <div class="p-3">
              <p class="text-sm font-medium line-clamp-1">
                {{ previewTitle }}
              </p>
              <p class="text-xs text-neutral-500 line-clamp-2">
                {{ previewDescription }}
              </p>
            </div>
          </div>
        </div>

        <!-- Facebook -->
        <div v-if="activePreview === 'facebook'" class="max-w-[500px] mx-auto">
          <div class="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
            <div v-if="previewImage" class="aspect-[1.91/1] bg-neutral-100 dark:bg-neutral-700">
              <img :src="previewImage" class="w-full h-full object-cover" :alt="previewTitle">
            </div>
            <div v-else class="id-image-placeholder aspect-[1.91/1]">
              <UIcon name="i-carbon-image" class="text-2xl" />
              <span>No og:image</span>
            </div>
            <div class="p-3">
              <p class="text-base font-semibold line-clamp-1 mt-0.5">
                {{ previewTitle }}
              </p>
              <p class="text-sm text-neutral-500 line-clamp-1 mt-0.5">
                {{ previewDescription }}
              </p>
            </div>
          </div>
        </div>

        <!-- LinkedIn -->
        <div v-if="activePreview === 'linkedin'" class="max-w-[500px] mx-auto">
          <div class="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
            <div v-if="previewImage" class="aspect-[1.91/1] bg-neutral-100 dark:bg-neutral-800">
              <img :src="previewImage" class="w-full h-full object-cover" :alt="previewTitle">
            </div>
            <div v-else class="id-image-placeholder aspect-[1.91/1]">
              <UIcon name="i-carbon-image" class="text-2xl" />
              <span>No og:image</span>
            </div>
            <div class="p-3 bg-neutral-50 dark:bg-neutral-800">
              <p class="text-sm font-semibold line-clamp-2">
                {{ previewTitle }}
              </p>
            </div>
          </div>
        </div>

        <!-- Discord -->
        <div v-if="activePreview === 'discord'" class="max-w-[500px] mx-auto">
          <div class="rounded-lg overflow-hidden border-l-4 border-[#5865F2] bg-[#2f3136] text-white p-4">
            <p class="text-[#00aff4] text-sm font-semibold">
              {{ previewTitle }}
            </p>
            <p class="text-sm text-neutral-300 mt-1 line-clamp-2">
              {{ previewDescription }}
            </p>
            <div v-if="previewImage" class="mt-3 rounded-lg overflow-hidden max-w-[300px]">
              <img :src="previewImage" class="w-full object-cover" :alt="previewTitle">
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>

<style scoped>
/* Hero */
.id-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: var(--ui-radius);
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
}
.id-hero--success { border-color: oklch(70% 0.15 145 / 0.4); }
.id-hero--warning { border-color: oklch(70% 0.15 80 / 0.4); }

/* Score ring */
.id-score-ring {
  position: relative;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}
.id-score-ring__svg { width: 100%; height: 100%; }
.id-score-ring__progress { transition: stroke-dasharray 600ms cubic-bezier(0.22, 1, 0.36, 1); }
.id-score-ring__progress--success { stroke: oklch(65% 0.2 145); }
.id-score-ring__progress--warning { stroke: oklch(70% 0.18 80); }
.id-score-ring__text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 700;
  font-family: ui-monospace, monospace;
}

/* Browser tab mockup */
.id-browser-tab {
  flex-shrink: 0;
  width: 200px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg);
}
.id-browser-tab__chrome {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--ui-bg-elevated);
  border-bottom: 1px solid var(--ui-border);
}
.id-browser-tab__dots {
  display: flex;
  gap: 4px;
}
.id-browser-tab__dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ui-border);
}
.id-browser-tab__tab {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.id-browser-tab__bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
}

/* Social tabs */
.id-social-tab-bar {
  display: flex;
  gap: 0.125rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--ui-border);
  overflow-x: auto;
}
.id-social-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ui-text-muted);
  white-space: nowrap;
  transition: color 150ms, background 150ms;
}
.id-social-tab:hover { color: var(--ui-text); background: var(--ui-bg-elevated); }
.id-social-tab--active { color: var(--ui-primary); background: oklch(65% 0.2 145 / 0.08); }

/* Image placeholder */
.id-image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  background: var(--ui-bg-elevated);
  color: var(--ui-text-muted);
  font-size: 0.6875rem;
  font-weight: 500;
}
</style>
