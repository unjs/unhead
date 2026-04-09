<script setup lang="ts">
const count = ref(0)

useHead({
  title: 'Home',
  link: [
    { rel: 'canonical', href: 'https://example.com/' },
  ],
})

useSeoMeta({
  description: 'A demo site showcasing Unhead for Vue with SSR, featuring SEO meta tags, social sharing, and structured data.',
  ogTitle: 'Unhead Demo: Head Management for Vue',
  ogDescription: 'Explore powerful head management with Unhead. SSR support, social previews, and structured data out of the box.',
  ogImage: 'https://unhead.unjs.io/og.png',
  ogUrl: 'https://example.com/',
  ogType: 'website',
  ogSiteName: 'Unhead Demo',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Unhead Demo: Head Management for Vue',
  twitterDescription: 'Explore powerful head management with Unhead.',
  twitterImage: 'https://unhead.unjs.io/og.png',
})

useSchemaOrg([
  defineWebSite({
    name: 'Unhead Demo',
    url: 'https://example.com/',
    inLanguage: 'en',
    potentialAction: [
      defineSearchAction({
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://example.com/search?q={search_term_string}',
        },
      }),
    ],
  }),
  defineWebPage({
    '@type': 'WebPage',
    name: 'Unhead Vite SSR Demo',
    description: 'A demo site showcasing Unhead for Vue with SSR, featuring SEO meta tags, social sharing, and structured data.',
  }),
  defineOrganization({
    name: 'UnJS',
    url: 'https://unjs.io',
    logo: 'https://unhead.unjs.io/logo.png',
  }),
])

// Client-only: analytics/tracking meta
if (typeof window !== 'undefined') {
  useHead({
    meta: [
      { name: 'client-rendered', content: 'true' },
    ],
  })
}

// Server-only: bot hints
if (typeof window === 'undefined') {
  useHead({
    meta: [
      { name: 'server-timing', content: 'ssr;desc="Server Rendered"' },
    ],
  })
}
</script>

<template>
  <div>
    <h1>Unhead Vite SSR Demo</h1>
    <p>This page demonstrates social meta tags and SERP preview in devtools.</p>

    <div class="card">
      <button type="button" @click="count++">count is {{ count }}</button>
      <p>
        Edit
        <code>pages/HomePage.vue</code> to test HMR
      </p>
    </div>
  </div>
</template>

<style scoped>
.card {
  padding: 2rem;
}
</style>
