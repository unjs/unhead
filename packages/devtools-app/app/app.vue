<script setup lang="ts">
import type { DevtoolsNavItem } from '~/components/DevtoolsLayout.vue'
import { brokenLinks, validateLinks } from '~/composables/link-checker'
import { useDevtoolsConnection } from '~/composables/rpc'
import { loadShiki } from '~/composables/shiki'
import { state } from '~/composables/state'
import { checkForUpdate, hasUpdate, latestVersion } from '~/composables/update-check'

useDevtoolsConnection()
loadShiki()

// Validate external links whenever tags change
watch(() => state.value.tags, tags => validateLinks(tags), { immediate: true })

// Check for version updates once we have the version
watch(() => state.value.version, v => checkForUpdate(v), { immediate: true })

const tagsErrors = computed(() => brokenLinks.value.size)
const tagsWarnings = computed(() => (state.value.validationRules || []).filter(r => r.severity === 'warn').length)

const socialErrors = computed(() => {
  let count = 0
  for (const tag of state.value.tags) {
    if (tag.tag !== 'meta')
      continue
    const key = tag.props?.property || tag.props?.name || ''
    if (!key.startsWith('og:') && !key.startsWith('twitter:'))
      continue
    const content = tag.props?.content
    if (content && brokenLinks.value.has(content))
      count++
  }
  return count
})

const navItems = computed<DevtoolsNavItem[]>(() => [
  { value: 'tags', to: '/', icon: 'i-carbon-tag-group', label: 'Tags', errors: tagsErrors.value, warnings: tagsWarnings.value },
  { value: 'social', to: '/social', icon: 'i-carbon-share', label: 'Social', errors: socialErrors.value },
  { value: 'serp', to: '/serp', icon: 'i-carbon-search', label: 'SERP' },
  { value: 'identity', to: '/identity', icon: 'i-carbon-user-profile', label: 'Identity' },
  { value: 'schema', to: '/schema', icon: 'i-carbon-chart-relationship', label: 'Schema.org' },
  { value: 'scripts', to: '/scripts', icon: 'i-carbon-script', label: 'Scripts' },
  { value: 'docs', to: '/docs', icon: 'i-carbon-document', label: 'Docs' },
])
</script>

<template>
  <UApp>
    <DevtoolsLayout :nav-items="navItems">
      <template #brand>
        <div class="flex items-center gap-1.5 text-sm font-semibold text-highlighted">
          <Logo />
          <UTooltip v-if="state.version" :text="hasUpdate ? `Update available: v${latestVersion}` : `v${state.version}`">
            <a
              :href="hasUpdate ? 'https://npmx.dev/unhead' : undefined"
              :target="hasUpdate ? '_blank' : undefined"
              rel="noopener"
              class="relative inline-flex items-center"
            >
              <UBadge class="font-mono text-[10px]">
                v{{ state.version }}
              </UBadge>
              <span v-if="hasUpdate" class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-500 border border-[var(--ui-bg)]" />
            </a>
          </UTooltip>
        </div>
      </template>
      <template #stats />
      <NuxtPage />
    </DevtoolsLayout>
  </UApp>
</template>
