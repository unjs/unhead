<script setup lang="ts">
import { useContent, useRequestEvent, useSeoMeta } from '#imports'

const { page, layout } = useContent()

// Page not found, set correct status code on SSR
if (!(page as any).value && process.server) {
  const event = useRequestEvent()
  event.res.statusCode = 404
}

useSeoMeta({
  title: () => page.value.title,
  description: () => page.value.description,
})
</script>

<template>
<div class="document-driven-page">
  <NuxtLayout :name="layout as string || 'default'">
    <ContentRenderer v-if="page" :key="(page as any)._id" :value="page">
      <template #empty="{ value }">
      <DocumentDrivenEmpty :value="value" />
      </template>
    </ContentRenderer>
    <DocumentDrivenNotFound v-else />
  </NuxtLayout>
</div>
</template>
