<script setup lang="ts">
import { queryContent } from '#imports'

const siteConfig = useSiteConfig()

const { data } = await useAsyncData('code-example', () => queryContent('/_code-examples').findOne())

defineOgImageComponent('Fallback', {
  title: 'Unhead',
  description: 'The any-framework document head manager built for performance and delightful developer experience.',
  colorMode: 'light',
  theme: '#ecdc5a'
})
</script>

<template>
  <div>
    <section class="py-5 sm:py-10 xl:py-20">
      <div class="xl:grid gap-8 lg:grid-cols-12 mx-auto w-full sm:px-6 xl:h-[400px]">
        <div class="col-span-5 mb-5 sm:mb-10 xl:mb-0 flex flex-col justify-center">
          <h1 class="font-title mb-7 text-gray-900 dark:text-gray-100 text-center text-4xl leading-25 font-extrabold tracking-tight sm:text-5xl xl:text-left xl:text-[3.5rem]" style="line-height: 1.3;">
            <span class="max-w-6xl" v-html="siteConfig.tagline" />
          </h1>
          <p class="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto xl:ml-0 text-center text-xl xl:text-left">
            {{ siteConfig.description }}
          </p>

          <div class="mt-6 flex items-center justify-center gap-4 sm:mt-10 flex-row sm:gap-6 xl:justify-start">
            <UButton size="xl" to="/setup/unhead/introduction" class="transition">
              Get setup
            </UButton>
            <UButton to="/usage/composables/use-head" size="xl" variant="ghost">
              See Usage
            </UButton>
          </div>
        </div>
        <div class="padded-code xl:col-span-7 hidden sm:block">
          <div class="flex justify-center xl:justify-end">
            <div class="flex relative items-center bg-gradient-to-br to-green-200/50 from-blue-100/50 dark:from-green-500/10 dark:to-blue-500/20 rounded">
              <ContentRenderer :value="data" class="xl:col-span-6 max-w-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
    <section class="py-5 sm:py-10 xl:py-20">
      <h2 class="mb-10 text-3xl font-title">
        Features
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ShowcaseCard label="Feature Packed" description="With deduping, sorting, title templates, template params and dom events out of the box.">
          <Icon name="noto:bento-box" class="w-1/2 h-1/2" />
        </ShowcaseCard>
        <ShowcaseCard label="Rock-solid DOM Updates" description="Custom side-effect based algorithm to play nicely with your existing tags.">
          <Icon name="noto:rock" class="w-1/2 h-1/2" />
        </ShowcaseCard>
        <ShowcaseCard label="Pluggable Core" description="Hook into any part of the head rendering process using Hookable.">
          <Icon name="noto:deciduous-tree" class="w-1/2 h-1/2" />
        </ShowcaseCard>
        <ShowcaseCard label="Plugins for Extra Oomph" description="Boost your performance with custom plugins: Capo.js ordering, Vite tree-shaking, etc.">
          <Icon name="noto:rocket" class="w-1/2 h-1/2" />
        </ShowcaseCard>
        <ShowcaseCard label="Totally Typed" description="Full TypeScript head schema with MDN documentation.">
          <Icon name="noto:gem-stone" class="w-1/2 h-1/2" />
        </ShowcaseCard>
        <ShowcaseCard label="Ecosystem Battled Tested" description="Adopted by the Vue ecosystem with hundreds of bugs squished.">
          <Icon name="logos:vue" class="w-1/4 h-1/4" />
          <Icon name="logos:nuxt-icon" class="w-1/4 h-1/4" />
          <Icon name="logos:vitejs" class="w-1/4 h-1/4" />
        </ShowcaseCard>
      </div>
    </section>
    <section>
      <h2 class="mb-10 text-3xl font-title">
        Sponsors
      </h2>

      This package is most possible by these amazing sponsors.

      <a href="https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg">
        <img src="https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg" width="800" height="545" style="margin: 0 auto;">
      </a>
    </section>
  </div>
</template>

<style>
.padded-code pre {
  padding: 0.75em 1em;
}
</style>
