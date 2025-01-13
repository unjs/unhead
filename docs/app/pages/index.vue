<script setup lang="ts">
import { humanNumber } from '~/composables/format'

definePageMeta({
  breadcrumb: {
    icon: 'i-heroicons-home',
    ariaLabel: 'Home',
  },
})

const stats = inject('stats')

useSeoMeta({
  title: '%siteName %separator All-in-one Technical SEO for Nuxt',
  ogTitle: '%siteName %separator All-in-one Technical SEO for Nuxt',
  titleTemplate: null,
})

const { data: sponsors } = await useFetch('/api/github/sponsors')

defineOgImageComponent('Home', {
  title: 'Nuxt SEO',
  version: useRuntimeConfig().public.version,
})

useServerHead({
  link: [
    {
      rel: 'dns-prefetch',
      href: 'https://avatars.githubusercontent.com',
    },
  ],
})

const [DefineSectionTemplate, ReuseSectionTemplate] = createReusableTemplate()
</script>

<template>
  <div>
    <DefineSectionTemplate v-slot="{ section, $slots }">
      <section class="pb-8" :class="[section.bg, section.border]">
        <div class="xl:grid xl:max-w-full max-w-3xl mx-auto px-10 xl:px-0 grid-cols-6">
          <div class="col-span-1 pt-5 px-5 xl:p-0">
            <div class="sticky top-[80px] xl:py-10 flex xl:justify-end mr-5">
              <div class=" text-4xl font-mono flex  items-center gap-3">
                {{ section.id }}. <UIcon :name="section.icon" class="w-10 h-10" />
              </div>
            </div>
          </div>
          <div class="col-span-1 p-5 xl:p-0 relative xl:pr-7 h-full xl:px-4 xl:py-10">
            <div class="relative flex items-center gap-3 sticky top-[100px]">
              <div>
                <h2 class="text-3xl text-balance text-gray-700 dark:text-gray-100 leading-tight font-bold mb-3 flex items-center gap-2">
                  {{ section.title }}
                </h2>
                <div class="text-balance dark:text-gray-300/80 text-gray-600">
                  {{ section.description }}
                </div>
              </div>
            </div>
          </div>
          <div class="col-span-3 py-10 2xl:px-14 xl:pl-5">
            <div class="xl:grid flex flex-col grid-cols-2 2xl:px-5 2xl:gap-10 gap-5">
              <div>
                <component :is="$slots.a" />
              </div>
              <div>
                <component :is="$slots.b" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </DefineSectionTemplate>

    <div class="gradient" />
    <section class="xl:max-w-full max-w-3xl mx-auto py-5 sm:py-12 xl:py-20">
      <UContainer class="container mx-auto">
        <div class="xl:flex gap-10">
          <div class="flex flex-col justify-center">
            <h1 class="max-w-xl text-gray-900/90 dark:text-gray-100 text-4xl md:text-6xl leading-tight font-bold tracking-tight" style="line-height: 1.3;">
              Full-stack <span class="font-cursive text-yellow-500">&lt;head&gt;</span> package built for <span class="bg-green-500/10 px-2"> any framework</span>.
            </h1>
            <p class="max-w-xl text-gray-700 dark:text-gray-300 mt-4 max-w-3xl text-base md:text-xl">
              Unhead is the any-framework document head manager built for SEO, performance and delightful developer experience.
            </p>

            <div class="flex mb-5 items-center gap-4 mt-5 md:mt-10  justify-start">
              <UButton size="lg" to="/docs/unhead/typescript/introduction" class=" font-bold bg-gradient bg-gradient-to-r from-[#FBBF24] to-[#f0db4f] text-neutral-800">
                Get Started
              </UButton>
              <UButton size="lg" icon="i-carbon-download" variant="ghost" to="/docs/unhead/typescript/installation">
                Install Unhead
              </UButton>
            </div>
          </div>
          <div class="hidden xl:block max-w-2xl">
            <div class="relative h-full">
              <div class="z-10 text-blue-200 w-full h-full flex items-center justify-center group-hover:text-blue-500 transition-all relative" />
            </div>
          </div>
        </div>
      </UContainer>
    </section>
    <ReuseSectionTemplate
      :section="{
        id: 1,
        icon: 'i-noto-spider',
        title: 'SEO',
        description: 'Nail your SEO with foolproof flat meta config and the simplest Schema.org you\'ve ever worked with.',
        bg: 'dark:bg-pink-500/5 bg-pink-500/15',
        border: 'border-pink-500/10 border-pink-500/50',
      }"
    >
      <template #a />
      <template #b>
        <ModuleFeaturesCard module="sitemap" :items="sitemapItems" />
      </template>
    </ReuseSectionTemplate>
    <ReuseSectionTemplate
      v-motion-fade-visible
      :section="{
        id: 2,
        icon: 'i-noto-robot',
        title: 'Feed semantic data to hungry bots.',
        description: 'Robots love data, give them what they want with Schema.org and Open Graph tags.',
        bg: 'dark:bg-purple-500/5 bg-purple-500/15',
        border: 'border-purple-500/10 border-purple-500/50',
      }"
    >
      <template #a>
        <ModuleFeaturesCard module="schema-org" :items="schemaOrgItems" />
      </template>
      <template #b>
        <ModuleFeaturesCard module="seo-utils" :items="seoUtilOneItems" />
      </template>
    </ReuseSectionTemplate>
    <ReuseSectionTemplate
      v-motion-fade-visible
      :section="{
        id: 3,
        icon: 'i-noto-sparkles',
        title: 'Humanize it.',
        description: 'Technical SEO doesn\'t just involve robots, make sure your site is human friendly too.',
        bg: 'dark:bg-yellow-500/5 bg-yellow-500/15',
        border: 'border-yellow-500/10 border-yellow-500/50',
      }"
    >
      <template #a>
        <ModuleFeaturesCard module="og-image" :items="ogImageItems" />
      </template>
      <template #b>
        <ModuleFeaturesCard module="seo-utils" :items="seoUtilsTwoItems" />
      </template>
    </ReuseSectionTemplate>
    <ReuseSectionTemplate
      v-motion-fade-visible
      :section="{
        id: 4,
        icon: 'i-noto-potted-plant',
        title: 'Nurture and watch it flourish.',
        description: 'Providing a robots.txt and sitemap.xml gives web crawlers data on how to index your site.',
        bg: 'dark:bg-green-500/5 bg-green-500/15',
        border: 'border-green-500/10 border-green-500/50',
      }"
    >
      <template #a>
        <div class="space-y-6">
          <ModuleFeaturesCard module="link-checker" :items="linkCheckerItems" />
          <ModuleCardInternalLinks />
          <ModuleCardSEOValidate />
        </div>
      </template>
      <template #b>
        <div class="mb-8">
          <ModuleCardMagicRedirects />
        </div>
        <ModuleCardGsc />
      </template>
    </ReuseSectionTemplate>
    <section v-motion-slide-visible-once-left class="py-10 xl:py-20">
      <UContainer class="mb-10 container">
        <h2 class="font-bold mb-5 text-3xl">
          Unhead Principals
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <ShowcaseCard label="Delightful Developer Experience" description="Full featured modules that do everything you expect and more.">
            <UIcon name="i-noto-sparkles" class="w-1/2 h-1/2" />
          </ShowcaseCard>
          <ShowcaseCard label="Zero Config Defaults" description="Provide a site URL and all modules are good to go. Fully extensible with config and hooks.">
            <UIcon name="i-noto-rocket" class="w-1/2 h-1/2" />
          </ShowcaseCard>
          <ShowcaseCard label="Extensible" description="Modules integrate with themselves as well as Nuxt Content, Nuxt I18n and Nuxt DevTools.">
            <UIcon name="i-noto-hook" class="w-1/2 h-1/2" />
          </ShowcaseCard>
        </div>
      </UContainer>
    </section>
    <section class="pb-10 xl:pb-20">
      <UContainer class="max-w-6xl">
        <div class="lg:flex gap-10 items-center justify-between">
          <div class="mb-10">
            <div class="mb-10 mx-auto max-w-[35rem] flex flex-col justify-center">
              <h2 class="font-bold mb-5 text-5xl">
                Up To Date. Always.
                <span class="text-blue-300 text-3xl" />
              </h2>
              <p class="text-gray-700 mb-3 dark:text-gray-300 mt-4 max-w-3xl text-center text-xl lg:text-left">
                Unhead was started at the end of 2022 and has received continuous bug fixes and feature improvements from the community.
              </p>
              <div class="gap-2 mx-auto text-center grid grid-cols-12">
                <span v-for="(c, index) in stats.contributors || []" :key="index" class="inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-full align-middle bg-[--ui-bg-elevated] size-8 text-base">
                  <NuxtImg class="h-full w-full rounded-[inherit] object-cover" :alt="`GitHub User ${c.login}`" size="xl" height="45" width="45" loading="lazy" :src="c.avatar_url" />
                </span>
              </div>
            </div>
          </div>
          <div class=" text-center justify-center gap-16 lg:mx-20 xl:mx-0 mb-10 ">
            <div class="mb-7">
              <div class="md:flex justify-center gap-10">
                <div>
                  <div class="font-light justify-center flex items-center gap-3 text-6xl mb-2">
                    <UIcon name="i-carbon-commit" />
                    {{ humanNumber(stats.commitCount) }}
                  </div>
                  <div class="text-sm opacity-80">
                    Commits
                  </div>
                </div>
                <div>
                  <div class="font-light justify-center flex items-center gap-3 text-6xl mb-2">
                    <UIcon name="i-carbon-checkmark" />
                    {{ humanNumber(stats.issuesClosed) }}
                  </div>
                  <div class="text-sm opacity-80">
                    Issues Closed
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div>
                <div class="font-light text-6xl mb-2">
                  <UIcon name="i-carbon-user-favorite-alt" />
                  {{ humanNumber(stats.contributors.length) }}
                </div>
                <div class="text-sm opacity-80">
                  Contributors
                </div>
              </div>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <section class="pb-10 xl:pb-20">
      <UContainer class="container">
        <div class="xl:flex items-center justify-around my-14">
          <div class="xl:max-w-sm xl:mb-0 mb-10">
            <div class="font-bold mb-5 text-5xl">
              {{ humanNumber(stats.modules[0].averageDownloads90) }} downloads<br>
              <span class="text-blue-300 text-3xl">per day, on average</span>
            </div>
            <p class="opacity-80 mb-5">
              Unhead is used and trusted by thousands of developers and companies around the world.
            </p>
          </div>
          <div class="text-6xl space-y-6 px-5 lg:px-0">
            <div class="flex justify-between text-right gap-5">
              <div class="mb-1  font-light items-center flex gap-5">
                <UIcon name="i-carbon-chart-line-smooth" class="h-15 w-15 mr-1 opacity-80" />
                {{ humanNumber(stats.modules[0].totalDownloads30) }}
              </div>
              <div class="flex items-center font-normal opacity-70 text-sm">
                Downloads<br>/ month
              </div>
            </div>
            <div class="flex justify-between gap-5">
              <div class="mb-1 font-light items-center flex gap-5">
                <UIcon name="i-carbon-star" class="h-15 w-15 mr-1 opacity-90" />
                {{ stats.stars.stars }}
              </div>
              <div class="flex items-center font-normal text-right opacity-70 text-sm">
                Total Stars
              </div>
            </div>
          </div>
        </div>
        <UCard class="max-w-full overflow-hidden sm:max-w-[600px] mx-auto p-5">
          <ClientOnly>
            <ChartDownloads :value="stats.modules[0].downloads" />
          </ClientOnly>
        </UCard>
      </UContainer>
    </section>
    <section class="mb-14">
      <UContainer>
        <div class="xl:grid grid-cols-2 gap-10">
          <div class="mb-10 mx-auto max-w-lg flex flex-col  lg:items-start">
            <h2 class=" font-bold mb-3 text-5xl text-center lg:text-left">
              Funded by the community
              <span class="text-blue-300 text-3xl" />
            </h2>
            <p class="mb-5 text-gray-700 dark:text-gray-300 mt-4 max-w-xl text-center text-xl lg:text-left">
              Unhead is completely free and open-source due to the generous support of the community.
            </p>
            <div>
              <UButton size="lg" to="https://github.com/sponsors/harlan-zw">
                Become a sponsor
              </UButton>
            </div>
          </div>
          <div class="max-w-xl mx-auto">
            <div class="text-2xl font-semibold mb-5">
              Top Sponsors
            </div>
            <div class="sm:grid space-y-5 md:space-y-0 grid-cols-3 gap-5 mb-10">
              <div v-for="(entry, key) in sponsors.$50" :key="key">
                <NuxtLink :to="entry.sponsor.websiteUrl" class="flex items-center gap-2">
                  <NuxtImg loading="lazy" :alt="entry.sponsor.name" width="56" height="56" :src="entry.sponsor.avatarUrl" class="w-14 h-14 rounded-full" />
                  <div>
                    <div class="font-bold text-xl whitespace-nowrap">
                      {{ entry.sponsor.name }}
                    </div>
                    <div v-if="entry.sponsor.websiteUrl" class="text-gray-400">
                      {{ entry.sponsor.websiteUrl.replace('https://', '') }}
                    </div>
                  </div>
                </NuxtLink>
              </div>
            </div>
            <div class="text-2xl font-semibold mb-5">
              Gold Sponsors
            </div>
            <div class="sm:grid space-y-5 md:space-y-0 grid-cols-3 gap-5 mb-10">
              <div v-for="(entry, key) in sponsors.$25" :key="key">
                <NuxtLink :to="entry.sponsor.websiteUrl" class="flex items-center gap-2">
                  <NuxtImg loading="lazy" :alt="entry.sponsor.name || entry.sponsor.login" width="48" height="48" :src="entry.sponsor.avatarUrl" class="w-12 h-12 rounded-full" />
                  <div>
                    <div class="font-bold text-sm whitespace-nowrap">
                      {{ entry.sponsor.name || entry.sponsor.login }}
                    </div>
                    <div v-if="entry.sponsor.websiteUrl" class="text-xs text-gray-400">
                      {{ entry.sponsor.websiteUrl.replace('https://', '') }}
                    </div>
                  </div>
                </NuxtLink>
              </div>
            </div>
            <div class="text-2xl font-semibold mb-5">
              Backers
            </div>
            <div class="grid grid-cols-6 sm:grid-cols-10 gap-3 mb-10">
              <div v-for="(entry, key) in sponsors.others" :key="key">
                <UTooltip :text="entry.sponsor.name || entry.sponsor.login">
                  <NuxtLink :to="(entry.monthlyDollars > 5 ? entry.sponsor.websiteUrl : entry.sponsor.linkUrl) || entry.sponsor.linkUrl" class="flex items-center gap-2">
                    <NuxtImg loading="lazy" :alt="entry.sponsor.name || entry.sponsor.login" width="48" height="48" :src="entry.sponsor.avatarUrl" class="w-12 h-12 rounded-full" :class="entry.monthlyDollars > 5 ? ['ring-green-500 ring-2'] : []" />
                  </NuxtLink>
                </UTooltip>
              </div>
            </div>
          </div>
        </div>
      </UContainer>
    </section>
  </div>
</template>
