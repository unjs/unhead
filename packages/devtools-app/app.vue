<script setup lang="ts">
import { useDevtoolsConnection } from './composables/rpc'
import { state } from './composables/state'

useDevtoolsConnection()

const route = useRoute()
const currentTab = computed(() => {
  if (route.path.startsWith('/serp'))
    return 'serp'
  if (route.path.startsWith('/identity'))
    return 'identity'
  if (route.path.startsWith('/schema'))
    return 'schema'
  if (route.path.startsWith('/scripts'))
    return 'scripts'
  return 'tags'
})

const navItems = [
  { value: 'tags', to: '/', icon: 'i-carbon-tag-group', label: 'Tags' },
  { value: 'serp', to: '/serp', icon: 'i-carbon-search', label: 'SERP' },
  { value: 'identity', to: '/identity', icon: 'i-carbon-user-profile', label: 'Identity' },
  { value: 'schema', to: '/schema', icon: 'i-carbon-chart-relationship', label: 'Schema.org' },
  { value: 'scripts', to: '/scripts', icon: 'i-carbon-script', label: 'Scripts' },
]
</script>

<template>
  <UApp>
    <div class="devtools-root">
      <header class="devtools-header">
        <div class="devtools-brand">
          <UIcon name="i-carbon-header-footer" class="text-lg text-[var(--color-primary)]" />
          <span class="font-semibold">Unhead</span>
          <UBadge v-if="state.ssr" color="info" variant="subtle" size="xs">
            SSR
          </UBadge>
          <UBadge v-else color="success" variant="subtle" size="xs">
            Client
          </UBadge>
        </div>
        <nav class="devtools-nav">
          <NuxtLink
            v-for="item in navItems"
            :key="item.value"
            :to="item.to"
            class="devtools-nav-item"
            :class="{ active: currentTab === item.value }"
          >
            <UIcon :name="item.icon" />
            {{ item.label }}
          </NuxtLink>
        </nav>
        <div class="devtools-stats">
          <UBadge color="info" variant="subtle" size="xs">
            {{ state.entries.length }} entries
          </UBadge>
          <UBadge color="success" variant="subtle" size="xs">
            {{ state.tags.length }} tags
          </UBadge>
        </div>
      </header>
      <main class="devtools-content">
        <NuxtPage />
      </main>
    </div>
  </UApp>
</template>

<style>
.devtools-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  font-family: 'Hubot Sans', system-ui, sans-serif;
}

.devtools-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-bg);
  flex-shrink: 0;
}

.devtools-brand {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.devtools-nav {
  display: flex;
  gap: 2px;
}

.devtools-nav-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--ui-text-muted);
  text-decoration: none;
  transition: all 0.15s;
}

.devtools-nav-item:hover {
  background: var(--ui-bg-elevated);
  color: var(--ui-text);
}

.devtools-nav-item.active {
  background: var(--ui-bg-elevated);
  color: var(--ui-text);
  font-weight: 500;
}

.devtools-stats {
  margin-left: auto;
  display: flex;
  gap: 6px;
}

.devtools-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}
</style>
