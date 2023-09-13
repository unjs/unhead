<template>
<div>
  <Header />

  <UContainer>
    <UMain>
      <UPage>
        <UPageError :error="error" />
      </UPage>
    </UMain>
  </UContainer>

</div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

useSeoMeta({
  title: 'Page not found',
  description: 'We are sorry but this page could not be found.'
})

defineProps<{
  error: NuxtError
}>()

const { data: navigation } = await useLazyAsyncData('navigation', () => fetchContentNavigation(), {
  default: () => [],
  // transform: (navigation) => {
  //   navigation = navigation.find(link => link._path === prefix.value)?.children || []
  //
  //   return prefix.value === '/main' ? removePrefixFromNavigation(navigation) : navigation
  // }
})

// Provide
provide('navigation', navigation)
</script>
