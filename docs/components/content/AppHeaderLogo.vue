<script setup lang="ts">
const docus = useDocus()
const logo = computed(() => docus.value.header?.logo || false)
const title = computed(() => docus.value.header?.title || docus.value.title)
</script>

<template>
  <NuxtLink class="navbar-logo" to="/" :aria-label="docus?.header?.title">
    <div class="flex items-center">
      <div class="flex items-center mr-5">
        <div>
          <icon name="lucide:triangle" class="text-black dark:text-white w-5 h-5 mr-2" />
        </div>
        <div class="flex flex-col">
          <span class="opacity-60 text-xs">@unjs/</span>
          <h1 class="font-bold text-xl">Unhead</h1>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>

<style lang="ts" scoped>
css({
  a: {
    display: 'flex',
    alignItems: 'center',
    flex: 'none',
  }
})
</style>
