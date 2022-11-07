<script setup lang="ts">
defineProps<{
  avatar: string
  name: string
  github: string
  twitter?: string
  sponsors?: boolean
}>()
</script>

<template>
  <div class="flex w-full mx-auto my-20">
    <div class="text-left flex-grow">
      <div class="text-xs opacity-75">
        Created by
      </div>
      <div class="text-xl mt-2 mb-2 flex">
        <img :src="avatar" :alt="name" class="mx-auto rounded h-[30px] w-[30px] rounded-full" height="30" width="30">
        <div class="flex-grow ml-2">{{ name }}</div>
      </div>
      <div class="op60">
        <slot />
      </div>
      <div class="py-4 flex items-center gap-4 text-2xl">
        <a
          :href="`https://github.com/${github}`"
          target="_blank"
        >
          <icon name="logos:github-icon"></icon>
        </a>
        <a
          :href="`https://twitter.com/${twitter}`"
          target="_blank"
        >
          <icon name="logos:twitter"></icon>
        </a>
      </div>
    </div>
  </div>
</template>
