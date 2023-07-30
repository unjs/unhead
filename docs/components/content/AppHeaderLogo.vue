<script setup lang="ts">
const docus = useDocus()
</script>

<template>
<NuxtLink class="navbar-logo" to="/" :aria-label="docus?.header?.title">
  <div class="flex items-center">
    <div class="flex items-center mr-3">
      <img src="https://avatars.githubusercontent.com/u/80154025?s=200&v=4" class="w-10 h-10" alt="UnJS" />
      <h1 class="font-bold text-xl ml-3">
        Unhead
      </h1>
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
