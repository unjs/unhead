<script setup lang="ts">
import { isBrokenUrl } from '~/composables/link-checker'
import { state } from '~/composables/state'

const seo = computed(() => state.value.seo)

const previewTitle = computed(() => seo.value.ogTitle || seo.value.title || 'Untitled')
const previewDescription = computed(() => seo.value.ogDescription || seo.value.description || '')
const previewImage = computed(() => {
  const img = seo.value.ogImage
  if (!img || isBrokenUrl(img))
    return null
  return img
})
const ogImageBroken = computed(() => !!seo.value.ogImage && isBrokenUrl(seo.value.ogImage))
const previewSiteName = computed(() => {
  try {
    return new URL(seo.value.canonical || '').hostname
  }
  catch {
    return seo.value.canonical || 'example.com'
  }
})

const activePreview = ref('twitter')
const previewTabs = [
  { label: 'X / Twitter', value: 'twitter', icon: 'i-carbon-logo-x' },
  { label: 'Facebook', value: 'facebook', icon: 'i-carbon-logo-facebook' },
  { label: 'LinkedIn', value: 'linkedin', icon: 'i-carbon-logo-linkedin' },
  { label: 'Discord', value: 'discord', icon: 'i-carbon-logo-discord' },
  { label: 'Slack', value: 'slack', icon: 'i-carbon-logo-slack' },
]

function onTabKeydown(e: KeyboardEvent) {
  const idx = previewTabs.findIndex(t => t.value === activePreview.value)
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    activePreview.value = previewTabs[(idx + 1) % previewTabs.length]!.value
  }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    activePreview.value = previewTabs[(idx - 1 + previewTabs.length) % previewTabs.length]!.value
  }
}

// Filter to OG + Twitter meta tags
const socialTags = computed(() =>
  state.value.tags.filter((t) => {
    if (t.tag !== 'meta')
      return false
    const key = t.props?.property || t.props?.name || ''
    return key.startsWith('og:') || key.startsWith('twitter:')
  }),
)
</script>

<template>
  <div class="space-y-4">
    <!-- Social Previews -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-carbon-share" class="text-lg" />
          <span class="font-medium">Social Preview</span>
        </div>
      </template>

      <div role="tablist" aria-label="Social preview platforms" class="flex gap-0.5 px-3 py-2 border-b border-default overflow-x-auto" @keydown="onTabKeydown">
        <button
          v-for="tab of previewTabs"
          :id="`social-tab-${tab.value}`"
          :key="tab.value"
          role="tab"
          :aria-selected="activePreview === tab.value"
          :aria-controls="`social-panel-${tab.value}`"
          :tabindex="activePreview === tab.value ? 0 : -1"
          :aria-label="tab.label"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors duration-150"
          :class="activePreview === tab.value
            ? 'bg-elevated text-highlighted'
            : 'text-muted hover:bg-elevated hover:text-default'"
          @click="activePreview = tab.value"
        >
          <UIcon :name="tab.icon" class="text-sm" />
          <span class="hidden sm:inline">{{ tab.label }}</span>
        </button>
      </div>

      <div class="p-6">
        <!-- Twitter -->
        <div v-if="activePreview === 'twitter'" id="social-panel-twitter" role="tabpanel" aria-labelledby="social-tab-twitter" class="max-w-[500px] mx-auto">
          <div class="rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
            <div v-if="previewImage" class="aspect-[1.91/1] bg-neutral-100 dark:bg-neutral-800">
              <img :src="previewImage" class="w-full h-full object-cover" :alt="previewTitle" loading="lazy">
            </div>
            <div v-else class="flex flex-col items-center justify-center gap-1.5 aspect-[1.91/1] bg-elevated text-xs font-medium" :class="ogImageBroken ? 'text-red-400' : 'text-muted'">
              <UIcon :name="ogImageBroken ? 'i-carbon-warning-filled' : 'i-carbon-image'" class="text-2xl" />
              <span>{{ ogImageBroken ? 'Broken og:image' : 'No og:image' }}</span>
            </div>
            <div class="p-3">
              <p class="text-xs text-neutral-500">
                {{ previewSiteName }}
              </p>
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
        <div v-if="activePreview === 'facebook'" id="social-panel-facebook" role="tabpanel" aria-labelledby="social-tab-facebook" class="max-w-[500px] mx-auto">
          <div class="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
            <div v-if="previewImage" class="aspect-[1.91/1] bg-neutral-100 dark:bg-neutral-700">
              <img :src="previewImage" class="w-full h-full object-cover" :alt="previewTitle" loading="lazy">
            </div>
            <div v-else class="flex flex-col items-center justify-center gap-1.5 aspect-[1.91/1] bg-elevated text-xs font-medium" :class="ogImageBroken ? 'text-red-400' : 'text-muted'">
              <UIcon :name="ogImageBroken ? 'i-carbon-warning-filled' : 'i-carbon-image'" class="text-2xl" />
              <span>{{ ogImageBroken ? 'Broken og:image' : 'No og:image' }}</span>
            </div>
            <div class="p-3">
              <p class="text-[11px] text-neutral-500 uppercase tracking-wider">
                {{ previewSiteName }}
              </p>
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
        <div v-if="activePreview === 'linkedin'" id="social-panel-linkedin" role="tabpanel" aria-labelledby="social-tab-linkedin" class="max-w-[500px] mx-auto">
          <div class="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
            <div v-if="previewImage" class="aspect-[1.91/1] bg-neutral-100 dark:bg-neutral-800">
              <img :src="previewImage" class="w-full h-full object-cover" :alt="previewTitle" loading="lazy">
            </div>
            <div v-else class="flex flex-col items-center justify-center gap-1.5 aspect-[1.91/1] bg-elevated text-xs font-medium" :class="ogImageBroken ? 'text-red-400' : 'text-muted'">
              <UIcon :name="ogImageBroken ? 'i-carbon-warning-filled' : 'i-carbon-image'" class="text-2xl" />
              <span>{{ ogImageBroken ? 'Broken og:image' : 'No og:image' }}</span>
            </div>
            <div class="p-3 bg-neutral-50 dark:bg-neutral-800">
              <p class="text-sm font-semibold line-clamp-2">
                {{ previewTitle }}
              </p>
              <p class="text-xs text-neutral-500 mt-1">
                {{ previewSiteName }}
              </p>
            </div>
          </div>
        </div>

        <!-- Discord -->
        <div v-if="activePreview === 'discord'" id="social-panel-discord" role="tabpanel" aria-labelledby="social-tab-discord" class="max-w-[500px] mx-auto">
          <div class="rounded-lg overflow-hidden border-l-4 border-[#5865F2] bg-[#2f3136] text-white p-4">
            <p class="text-xs text-neutral-400 mb-1">
              {{ previewSiteName }}
            </p>
            <p class="text-[#00aff4] text-sm font-semibold">
              {{ previewTitle }}
            </p>
            <p class="text-sm text-neutral-300 mt-1 line-clamp-2">
              {{ previewDescription }}
            </p>
            <div v-if="previewImage" class="mt-3 rounded-lg overflow-hidden max-w-[300px]">
              <img :src="previewImage" class="w-full object-cover" :alt="previewTitle" loading="lazy">
            </div>
            <div v-else class="flex flex-col items-center justify-center gap-1.5 mt-3 max-w-[300px] aspect-video rounded-lg bg-[#36393f] text-xs font-medium" :class="ogImageBroken ? 'text-red-400' : 'text-[#72767d]'">
              <UIcon :name="ogImageBroken ? 'i-carbon-warning-filled' : 'i-carbon-image'" class="text-xl" />
              <span>{{ ogImageBroken ? 'Broken image' : 'No image' }}</span>
            </div>
          </div>
        </div>

        <!-- Slack -->
        <div v-if="activePreview === 'slack'" id="social-panel-slack" role="tabpanel" aria-labelledby="social-tab-slack" class="max-w-[500px] mx-auto">
          <div class="rounded-lg overflow-hidden border-l-4 border-neutral-300 dark:border-neutral-600 pl-4 py-2">
            <p class="text-xs text-neutral-500 font-bold mb-1">
              {{ previewSiteName }}
            </p>
            <p class="text-[#1264a3] dark:text-[#1d9bd1] text-sm font-bold">
              {{ previewTitle }}
            </p>
            <p class="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5 line-clamp-2">
              {{ previewDescription }}
            </p>
            <div v-if="previewImage" class="mt-2 rounded overflow-hidden max-w-[360px]">
              <img :src="previewImage" class="w-full object-cover" :alt="previewTitle" loading="lazy">
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- OG Tags Table -->
    <DevtoolsTagTable :tags="socialTags" title="Open Graph Tags" icon="i-carbon-share" />

    <!-- OG Image Preview -->
    <UCard v-if="seo.ogImage">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-carbon-image" class="text-lg" />
            <span class="font-medium">OG Image</span>
          </div>
          <UBadge v-if="ogImageBroken" color="error" variant="subtle" size="xs">
            Broken
          </UBadge>
        </div>
      </template>
      <div v-if="ogImageBroken" class="flex flex-col items-center justify-center gap-2 py-8 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20">
        <UIcon name="i-carbon-warning-filled" class="text-3xl text-red-400" />
        <span class="text-sm text-red-500 font-medium">Image failed to load</span>
        <p class="text-xs text-muted font-mono truncate max-w-full px-4">
          {{ seo.ogImage }}
        </p>
      </div>
      <template v-else>
        <div class="rounded-lg overflow-hidden border border-default">
          <img :src="seo.ogImage" class="w-full max-h-64 object-contain bg-neutral-100 dark:bg-neutral-800" alt="OG Image" loading="lazy">
        </div>
        <p class="mt-2 text-xs text-muted font-mono truncate">
          {{ seo.ogImage }}
        </p>
      </template>
    </UCard>
  </div>
</template>
