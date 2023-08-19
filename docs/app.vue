<script lang="ts" setup>
import { defineOgImageScreenshot } from '#imports'

defineOgImageScreenshot()
</script>

<template>
  <div class="app-layout">
    <AppLoadingBar />
    <AppHeader />
    <main>
      <NuxtPage />
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<style lang="ts" scoped>
css({
'.app-layout': {
  main: {
  minHeight: 'calc(100vh - {docus.header.height} - {docus.footer.height})',
}
}
})
</style>
