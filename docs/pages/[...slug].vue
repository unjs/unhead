<script setup lang="ts">
import { defineOgImageComponent, findPageHeadline, mapContentNavigation } from '#imports'

const route = useRoute()

const { data: page } = await useAsyncData(`docs-${route.path}`, () => queryContent(route.path).findOne())
if (!page.value)
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })

const { data: surround } = await useAsyncData(`docs-${route.path}-surround`, () => queryContent()
  .only(['_path', 'title', 'navigation', 'description'])
  .where({ _extension: 'md', navigation: { $ne: false } })
  .findSurround(route.path.endsWith('/') ? route.path.slice(0, -1) : route.path))

const [prev, next] = surround.value

useSeoMeta({
  title: () => page.value?.title,
  description: () => page.value?.description,
})

defineOgImageComponent('NuxtSeo', {
  title: page.value?.title,
  description: page.value?.description,
  colorMode: 'light',
  theme: '#ecdc5a',
})

const navigation = inject('navigation')
const children = computed(() => {
  return navigation.value.find((item) => {
    return route.path.startsWith(item._path)
  })?.children || []
})

const headline = computed(() => findPageHeadline(page.value))
const communityLinks = computed(() => [
  {
    icon: 'i-ph-pen-duotone',
    label: 'Edit this page',
    to: `https://github.com/unjs/unhead/edit/main/docs/content/${page?.value?._file}`,
    target: '_blank',
  },
  {
    icon: 'i-ph-chat-centered-text-duotone',
    label: 'Discord Support',
    to: 'https://discord.gg/275MBUBvgP',
    target: '_blank',
  },
  {
    icon: 'i-ph-hand-heart-duotone',
    label: 'Become a Sponsor',
    to: 'https://github.com/sponsors/harlan-zw',
    target: '_blank',
  },
])

const ecosystemLinks = [
  {
    label: 'Zhead',
    to: 'https://zhead.dev',
    target: '_blank',
  },
  {
    label: 'Unlighthouse',
    to: 'https://unlighthouse.dev',
    target: '_blank',
  },
  {
    label: 'Request Indexing',
    to: 'https://requestindexing.com',
    target: '_blank',
  },
]
</script>

<template>
  <UMain>
    <UPage :ui="{ wrapper: 'xl:gap-10' }">
      <template #left>
        <UAside>
          <UNavigationTree :links="mapContentNavigation(children)" />
        </UAside>
      </template>
      <div>
        <UPage :ui="{ wrapper: 'xl:gap-18' }">
          <UPageHeader :title="page.title" :description="page.description" :links="page.links" :headline="headline" />

          <UPageBody prose class="pb-0">
            <ContentRenderer v-if="page.body" :value="page" />
            <hr v-if="surround?.length" class="my-8">
            <UContentSurround :surround="surround" />
          </UPageBody>

          <template #right>
            <UContentToc :links="page.body?.toc?.links || []">
              <template #bottom>
                <div class="hidden !mt-6 lg:block space-y-6">
                  <UDivider dashed />
                  <Ads />
                  <UDivider v-if="page.body?.toc?.links?.length" dashed />
                  <UPageLinks title="Community" :links="communityLinks" />
                  <UDivider dashed />
                  <UPageLinks title="Ecosystem" :links="ecosystemLinks" />
                </div>
              </template>
            </UContentToc>
          </template>
        </UPage>
      </div>
    </UPage>
  </UMain>
</template>

<style>
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  border-radius: 10px;
  background-color: #f5f5f5;
}
::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background-color: #e0e0e0;
}
::-webkit-scrollbar-thumb:hover {
  background-color: #999999;
}
.dark ::-webkit-scrollbar-track {
  background-color: #333333;
}
.dark ::-webkit-scrollbar-thumb {
  background-color: #555555;
}
.dark ::-webkit-scrollbar-thumb:hover {
  background-color: #777777;
}
</style>
