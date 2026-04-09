<script setup lang="ts">
useHead({
  title: 'About',
  link: [
    { rel: 'canonical', href: 'https://example.com/about' },
  ],
})

useSeoMeta({
  description: 'Learn more about the Unhead demo site and how it showcases head management features.',
  ogTitle: 'About the Unhead Demo',
  ogDescription: 'Learn more about the Unhead demo site.',
  ogUrl: 'https://example.com/about',
})

useSchemaOrg([
  defineWebPage({
    '@type': 'AboutPage',
    name: 'About the Unhead Demo',
    description: 'Learn more about the Unhead demo site and how it showcases head management features.',
  }),
  defineBreadcrumb({
    itemListElement: [
      { name: 'Home', item: 'https://example.com/' },
      { name: 'About' },
    ],
  }),
])
</script>

<template>
  <div>
    <h1>About</h1>
    <p>This page exercises the Identity and Tags devtools tabs.</p>
    <p>Check the Identity tab to see favicons, theme colors, and color scheme metadata configured in App.vue.</p>
  </div>
</template>
