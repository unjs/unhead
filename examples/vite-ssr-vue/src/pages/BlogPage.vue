<script setup lang="ts">
useHead({
  title: 'Blog Post: Getting Started with Unhead',
  link: [
    { rel: 'canonical', href: 'https://example.com/blog' },
  ],
})

useSchemaOrg([
  defineArticle({
    '@type': 'BlogPosting',
    'headline': 'Getting Started with Unhead',
    'description': 'Learn how to manage document head tags with Unhead in your Vue application.',
    'datePublished': '2025-01-15',
    'dateModified': '2025-03-01',
    'image': 'https://unhead.unjs.io/og.png',
    'author': [
      definePerson({
        name: 'Harlan Wilton',
        url: 'https://harlanzw.com',
      }),
    ],
  }),
  defineBreadcrumb({
    itemListElement: [
      { name: 'Home', item: 'https://example.com/' },
      { name: 'Blog' },
    ],
  }),
  defineQuestion({
    name: 'What is Unhead?',
    acceptedAnswer: 'Unhead is a document head manager for any JavaScript framework.',
  }),
  defineQuestion({
    name: 'Does Unhead support SSR?',
    acceptedAnswer: 'Yes, Unhead has first-class SSR support with streaming capabilities.',
  }),
])

useSeoMeta({
  description: 'Learn how to manage document head tags with Unhead in your Vue application.',
  ogTitle: 'Getting Started with Unhead',
  ogDescription: 'Learn how to manage document head tags with Unhead.',
  ogType: 'article',
  ogUrl: 'https://example.com/blog',
  ogImage: 'https://unhead.unjs.io/og.png',
  articlePublishedTime: '2025-01-15',
  articleModifiedTime: '2025-03-01',
  articleAuthor: 'Harlan Wilton',
})
</script>

<template>
  <div>
    <h1>Getting Started with Unhead</h1>
    <p class="meta">Published Jan 15, 2025 by Harlan Wilton</p>

    <article>
      <p>This page demonstrates Schema.org structured data in the devtools.</p>
      <p>Open the Schema.org tab to see BlogPosting, WebSite, BreadcrumbList, and FAQPage nodes.</p>

      <h2>FAQ</h2>
      <dl>
        <dt>What is Unhead?</dt>
        <dd>Unhead is a document head manager for any JavaScript framework.</dd>
        <dt>Does Unhead support SSR?</dt>
        <dd>Yes, Unhead has first-class SSR support with streaming capabilities.</dd>
      </dl>
    </article>
  </div>
</template>

<style scoped>
.meta {
  color: #6b7280;
  font-size: 0.875rem;
}
article {
  margin-top: 1.5rem;
  line-height: 1.7;
}
dt {
  font-weight: 600;
  margin-top: 1rem;
}
dd {
  margin-left: 0;
  color: #4b5563;
}
</style>
