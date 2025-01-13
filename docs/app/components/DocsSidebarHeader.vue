<script setup lang="ts">
import { useContentSearch } from '#ui-pro/composables/useContentSearch'
import { createPerformanceMeasure } from '~/utils/perf'
import { selectedFramework } from '../composables/nav'

const module = useModule()
const searchTerm = ref('')
const perf = createPerformanceMeasure()
const nav = await useDocsNav()
console.log('docs nav', nav.value)
perf('docs-nav', nav.value?.navTiming)
perf('docs-search', nav.value?.searchTiming)
const files = computed(() => [])

const route = useRoute()
// const selectedFramework = computed(() => route.path.split('/')[3])
const versions = ['Latest', 'v1']
const { open } = useContentSearch()

function switchFramework(framework) {
  console.log('switchFramework', framework)
  const isFrameworkPath = route.path.split('/')[3] === selectedFramework.value
  selectedFramework.value = framework.slug
  const newUrl = isFrameworkPath ? `/docs/${module.value.slug}/${framework.slug}/${route.path.split('/').slice(4).join('/')}` : `/docs/${module.value.slug}/${route.path.split('/').slice(3).join('/')}`
  console.log({ isFrameworkPath, newUrl, navFlat: nav.value.navFlat })
  // check new url exists in flat nav
  if (nav.value.navFlat.find(link => link.path === newUrl)) {
    navigateTo({
      path: newUrl,
      query: {
        framework: selectedFramework.value,
      },
    })
  }
  else {
    navigateTo({
      path: `/docs/${module.value.slug}/${framework.slug}/introduction`,
      query: {
        framework: selectedFramework.value,
      },
    })
  }
}
</script>

<template>
  <div v-if="module && nav" class="pt-5">
    <div v-if="module" class="isolate -ml-2.5">
      <div class="hidden md:block md:sticky rounded bg-white dark:bg-gray-900 top-0 z-1 mb-2">
        <ModuleCard :key="module.slug" :module="module" :version="false" class="mb-2" />
      </div>
      <UInput type="search" class="mb-3 w-full" @click="open = true">
        <template #leading>
          <UContentSearchButton size="sm" class="p-0 opacity-70 hover:opacity-100" />
        </template>
      </UInput>
      <div class="block md:hidden flex items-center gap-1 font-bold mb-3">
        <UIcon v-if="module.icon" dynamic :name="module.icon" class="text-blue-500 dark:text-blue-300" />{{ module.label }}
      </div>
      <div class="flex items-center gap-4 mb-5">
        <UFormField label="Framework" class="w-1/2">
          <USelectMenu :search-input="false" size="sm" :model-value="module.frameworks.find(f => f.slug === selectedFramework)" :items="module.frameworks" class="md:w-full" @update:model-value="switchFramework" />
        </UFormField>
        <UFormField label="Version" class="w-1/2">
          <USelectMenu :search-input="false" size="sm" model-value="Latest" :items="versions" class="md:w-full" />
        </UFormField>
      </div>
    </div>
    <nav aria-title="Documentation Navigation">
      <ContentNavigation :key="selectedFramework" as="div" class="mb-5" default-open :collapsible="false" :navigation="nav?.top || []" highlight :ui="{ listWithChildren: 'sm:ml-0 my-10' }">
        <template #link-leading="{ link, active }">
          <div v-if="link.icon" class="rounded-md p-1 inline-flex ring-inset ring-1 bg-gray-100/50 dark:bg-gray-800/50 ring-gray-300 dark:ring-gray-700 group-hover:bg-primary group-hover:ring-primary group-hover:text-background" :class="active ? 'dark:bg-teal-700' : ''">
            <UIcon :name="link.icon" class="w-4 h-4 text-primary-400 dark:text-sky-200" />
          </div>
        </template>
      </ContentNavigation>
      <div class="bg-gray-800 h-[1px] my-5 mr-5" />
      <ContentNavigation :key="selectedFramework" as="div" default-open :collapsible="false" :navigation="nav?.bottom || []" highlight :ui="{ listWithChildren: 'sm:ml-0 my-10' }">
        <template #link="{ link }">
          <div v-if="!link.html" class="flex items-center justify-between gap-2 w-full">
            <div class="flex items-center gap-2">
              <UIcon v-if="link.icon" :name="link.icon" class="w-4 h-4 text-primary-400 dark:text-sky-200" />
              <div :class="link.children?.length ? 'text-sm font-bold' : ''">
                {{ link.title }}
              </div>
            </div>
            <UIcon v-if="link.tag" :name="`i-logos-${link.tag}`" dynamic class="w-4 h-4" />
          </div>
          <div v-else>
            <UIcon v-if="link.icon" :name="link.icon" class="w-4 h-4 text-primary-400 dark:text-sky-200" />
            <div v-html="link.title" />
          </div>
        </template>
      </ContentNavigation>
    </nav>
    <ClientOnly>
      <LazyUContentSearch
        v-model:search-term="searchTerm"
        :files="files"
        :navigation="[{ title: 'Getting Started', _path: `/docs/${module.slug}/getting-started`, path: `/docs/${module.slug}/getting-started`, children: nav.top }, ...nav.bottom]"
        :fuse="{ resultLimit: 42 }"
      />
    </ClientOnly>
  </div>
</template>
