<script setup lang="ts">
import { state } from '~/composables/state'
import { estimatePixelWidth, descColor as getDescColor, titleColor as getTitleColor, SEO_LIMITS } from '~/composables/tools'

const seo = computed(() => state.value.seo)

const titleLen = computed(() => seo.value.title?.length || 0)
const descLen = computed(() => seo.value.description?.length || 0)
const tColor = computed(() => getTitleColor(titleLen.value))
const dColor = computed(() => getDescColor(descLen.value))

function lengthStatusLabel(color: string): string {
  if (color === 'success')
    return 'Good'
  if (color === 'warning')
    return 'Needs work'
  return 'Too long'
}
</script>

<template>
  <div class="space-y-5">
    <!-- SERP Preview -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-carbon-search" class="text-lg" />
          <span class="font-medium">Google Search Preview</span>
        </div>
      </template>
      <div class="serp-preview-container">
        <div class="serp-preview">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-[26px] h-[26px] rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
              <UIcon name="i-carbon-earth" class="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <div class="text-xs text-neutral-600 dark:text-[#bdc1c6] leading-tight">
              {{ seo.canonical || 'example.com' }}
            </div>
          </div>
          <h3 class="serp-preview__title">
            {{ seo.title || 'No title found' }}
          </h3>
          <p class="serp-preview__description">
            {{ seo.description || 'No description found' }}
          </p>
        </div>
      </div>
    </UCard>

    <!-- Title & Description lengths -->
    <div class="grid md:grid-cols-2 gap-4">
      <UCard>
        <template #header>
          <span class="font-medium text-sm">Title</span>
        </template>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="serp-length-status" :class="`serp-length-status--${tColor}`">
              {{ lengthStatusLabel(tColor) }}
            </span>
            <span class="text-xs font-mono text-muted">
              {{ titleLen }}/{{ SEO_LIMITS.TITLE_MAX_CHARS }} chars · ~{{ estimatePixelWidth(seo.title || '') }}px
            </span>
          </div>
          <div class="serp-progress-track">
            <div
              class="serp-progress-fill"
              :class="`serp-progress-fill--${tColor}`"
              :style="{ width: `${Math.min(100, (titleLen / SEO_LIMITS.TITLE_MAX_CHARS) * 100)}%` }"
            />
            <div class="serp-progress-marker" :style="{ left: `${(30 / SEO_LIMITS.TITLE_MAX_CHARS) * 100}%` }" />
          </div>
          <p class="text-xs text-muted truncate">
            {{ seo.title || 'Not set' }}
          </p>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <span class="font-medium text-sm">Description</span>
        </template>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="serp-length-status" :class="`serp-length-status--${dColor}`">
              {{ lengthStatusLabel(dColor) }}
            </span>
            <span class="text-xs font-mono text-muted">
              {{ descLen }}/{{ SEO_LIMITS.DESC_MAX_CHARS }} chars
            </span>
          </div>
          <div class="serp-progress-track">
            <div
              class="serp-progress-fill"
              :class="`serp-progress-fill--${dColor}`"
              :style="{ width: `${Math.min(100, (descLen / SEO_LIMITS.DESC_MAX_CHARS) * 100)}%` }"
            />
            <div class="serp-progress-marker" :style="{ left: `${(SEO_LIMITS.DESC_WARN_CHARS / SEO_LIMITS.DESC_MAX_CHARS) * 100}%` }" />
          </div>
          <p class="text-xs text-muted truncate">
            {{ seo.description || 'Not set' }}
          </p>
        </div>
      </UCard>
    </div>
  </div>
</template>

<style scoped>
/* SERP preview */
.serp-preview-container {
  padding: 1.25rem;
  border-radius: 8px;
  background: white;
  border: 1px solid oklch(0% 0 0 / 0.08);
}
.dark .serp-preview-container {
  background: #202124;
  border-color: oklch(100% 0 0 / 0.06);
}
.serp-preview__title {
  font-size: 1.25rem;
  line-height: 1.3;
  color: #1a0dab;
  cursor: pointer;
  margin-bottom: 0.25rem;
}
.serp-preview__title:hover { text-decoration: underline; }
.dark .serp-preview__title { color: #8ab4f8; }
.serp-preview__description {
  font-size: 0.875rem;
  line-height: 1.58;
  color: #4d5156;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.dark .serp-preview__description { color: #bdc1c6; }

/* Length status */
.serp-length-status {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
}
.serp-length-status--success { background: oklch(75% 0.15 145 / 0.12); color: oklch(50% 0.15 145); }
.serp-length-status--warning { background: oklch(75% 0.12 80 / 0.12); color: oklch(55% 0.15 80); }
.serp-length-status--error { background: oklch(65% 0.15 25 / 0.1); color: oklch(55% 0.18 25); }
.dark .serp-length-status--success { background: oklch(50% 0.15 145 / 0.15); color: oklch(75% 0.18 145); }
.dark .serp-length-status--warning { background: oklch(55% 0.12 80 / 0.15); color: oklch(75% 0.15 80); }
.dark .serp-length-status--error { background: oklch(50% 0.12 25 / 0.15); color: oklch(72% 0.15 25); }

/* Progress bar */
.serp-progress-track {
  position: relative;
  height: 6px;
  border-radius: 3px;
  background: var(--ui-bg-accented);
  overflow: visible;
}
.serp-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 400ms cubic-bezier(0.22, 1, 0.36, 1);
}
.serp-progress-fill--success { background: oklch(65% 0.2 145); box-shadow: 0 0 8px oklch(65% 0.2 145 / 0.3); }
.serp-progress-fill--warning { background: oklch(70% 0.18 80); box-shadow: 0 0 8px oklch(70% 0.18 80 / 0.3); }
.serp-progress-fill--error { background: oklch(62% 0.2 25); box-shadow: 0 0 8px oklch(62% 0.2 25 / 0.3); }
.serp-progress-marker {
  position: absolute;
  top: -2px;
  width: 1px;
  height: 10px;
  background: var(--ui-text-muted);
  opacity: 0.4;
}
</style>
