<script setup lang="ts">
import type { PropType } from 'vue'

defineProps({
  cta: {
    type: Array as PropType<string[]>,
    required: false,
  },
  secondary: {
    type: Array as PropType<string[]>,
    required: false,
  },
  snippet: {
    type: String,
    required: false,
  },
  video: {
    type: Array as PropType<string[]>,
    required: false,
  },
})
</script>

<template>
<section class="py-5 sm:py-24 lg:py-32">
  <div class="md:grid gap-8 lg:grid-cols-12 mx-auto w-full sm:px-6 lg:px-0 px-0 max-w-8xl">
    <div class="lg:col-span-6 mb-10 lg:mb-0 flex flex-col justify-center">
      <p v-if="$slots.top" class="mb-2 text-center lg:text-left">
        <Markdown :use="$slots.top" unwrap="p" />
      </p>

      <h1 class="u-text-gray-900 text-center text-4xl leading-25 font-extrabold tracking-tight sm:text-5xl lg:text-left lg:text-6xl" style="line-height: 1.3;">
        <Markdown :use="$slots.title" unwrap="p" />
      </h1>

      <p class="u-text-gray-500 mt-4 max-w-3xl text-center text-lg lg:text-left">
        <Markdown :use="$slots.description" unwrap="p" />
      </p>

      <div v-if="$slots.extra" class="mt-6">
        <Markdown :use="$slots.extra" unwrap="p" />
      </div>

      <div class="mt-6 flex flex-col items-center justify-center gap-4 sm:mt-10 sm:flex-row sm:gap-6 lg:justify-start">
        <template v-if="!$slots.actions">
        <ButtonLink v-if="cta" class="!mb-0 dark:bg-green-800!" bold size="large" :href="cta[1] as any">
          {{ cta[0] }}
        </ButtonLink>

        <a v-if="secondary" :href="secondary[1] as any" class="u-text-gray-500 hover:u-text-gray-700 py-px font-medium">
          {{ secondary[0] }}
        </a>
        </template>
        <Markdown v-else :use="$slots.actions" unwrap="p" />
      </div>
    </div>

    <div class="block-hero__right lg:col-span-6">
      <div class="flex relative items-center block-hero__inner ht p-10 bg-gradient-to-br to-green-200 from-blue-100 dark:from-green-500/10 dark:to-blue-500/20 rounded">
        <slot name="right">
          <Markdown :use="$slots.right" unwrap="p" />
        </slot>
      </div>
    </div>
  </div>
</section>
</template>

<style scoped>
@media(min-width: 1024px) {
  .block-hero__inner {
    height: 500px;
    overflow: auto;
  }
}
:deep(.code-group) {
  width: 100%;
}
</style>
