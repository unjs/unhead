<script setup lang="ts">
export interface DevtoolsNavItem {
  value: string
  to: string
  icon: string
  label: string
  warnings?: number
  errors?: number
}

const {
  navItems,
} = defineProps<{
  navItems: DevtoolsNavItem[]
}>()

const router = useRouter()
const route = useRoute()

const activeTab = computed(() => {
  for (const item of navItems) {
    if (item.to === '/' && route.path === '/')
      return item.value
    // Match exact path or nested children, not sibling paths like `/schema-preview` for `/schema`
    if (item.to !== '/' && (route.path === item.to || route.path.startsWith(`${item.to}/`)))
      return item.value
  }
  return navItems[0]?.value
})

const routeMap = computed(() => Object.fromEntries(navItems.map(i => [i.value, i.to])))

function onTabChange(value: string | number) {
  const to = routeMap.value[value]
  if (to)
    router.push(to)
}
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <header class="devtools-header shrink-0">
      <div class="flex items-center gap-3 min-w-0">
        <slot name="brand" />
        <UTabs
          :model-value="activeTab"
          :items="navItems"
          value-key="value"
          label-key="label"
          variant="link"
          color="neutral"
          :content="false"
          :ui="{ root: 'min-w-0', list: 'border-none gap-5', leadingIcon: 'size-3.5 opacity-50 group-data-[state=open]:opacity-90 transition-opacity' }"
          @update:model-value="onTabChange"
        >
          <template #trailing="{ item }">
            <span v-if="item.errors" class="size-1.5 rounded-full bg-red-500" />
            <span v-else-if="item.warnings" class="size-1.5 rounded-full bg-amber-500" />
          </template>
        </UTabs>
      </div>
      <div class="ml-auto flex items-center gap-1.5">
        <slot name="stats" />
      </div>
    </header>
    <main class="flex-1 overflow-auto p-4">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.devtools-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-bg);
}
</style>
