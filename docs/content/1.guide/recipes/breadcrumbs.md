---
title: Breadcrumbs
---

# Setting up Schema.org for Breadcrumbs in Vue

Creating breadcrumbs on your site is a great way to help your users understand your website hierarchy.

## Useful Links

- [Breadcrumb | Google Search Central](https://developers.google.com/search/docs/advanced/structured-data/breadcrumb)
- [Breadcrumb | Yoast](https://developer.yoast.com/features/schema/pieces/breadcrumb)

## Marking up Breadcrumbs

The [defineBreadcrumb](/schema/breadcrumb) function and [SchemaOrgBreadcrumb](/guide/guides/components) component are provided
to create Breadcrumb Schema whilst handling relations for you.


Imagine we want to generate the following markup with the appropriate Schema.

Note: Google recommends that the markup for the breadcrumbs should exist on the page matching the Schema.org entry.

::code-group

```vue [Composition API]
<script setup lang="ts">
const breadcrumbs = [
  // item is the url and will be resolved to the absolute url  
  { name: 'Home', item: '/' },
  { name: 'Articles', item: '/blog' },
  // item is not required for the last list element
  { name: 'How do breadcrumbs work' },
]
useSchemaOrg([
  defineBreadcrumb({
    itemListElement: breadcrumbs
  }),
])
</script>
<template>
<ul>
  <template v-for="(item, key) in breadcrumbs" :key="key">
  <li>
    <template v-if="item.item">
    <a :href="item.item">{{ item.name }}</a>
    <span>/</span>
    </template>
    <span v-else>{{ item.name }}</span>
  </li>
  </template>
</ul>
</template>
```

```vue [Component API]
<script setup>
const breadcrumb = [
  { item: '/', name: 'Home' },
  { item: '/guide/recipes', name: 'Recipes' },
  { name: 'Breadcrumbs' }
]
</script>
<template>
<SchemaOrgBreadcrumb
  as="ul"
  :item-list-element="breadcrumb"
>
  <template v-for="(item, key) in breadcrumb" :key="key">
  <li>
    <template v-if="item.item">
    <a :href="item.item">{{ item.name }}</a>
    <span>/</span>
    </template>
    <span v-else>{{ item.name }}</span>
  </li>
  </template>
</SchemaOrgBreadcrumb>
</template>
```
::


## Adding Multiple Breadcrumbs

There may be some cases where you'd like multiple breadcrumbs to be displayed.

For these cases you can provide an `@id` and it will avoid overwriting the primary breadcrumb.

```vue
<script setup lang="ts">
useSchemaOrg([
  // primary breadcrumb
  defineBreadcrumb({
    itemListElement: [
      // item is the url and will be resolved to the absolute url  
      { name: 'Home', item: '/' },
      { name: 'Articles', item: '/blog' },
      // item is not required for the last list element
      { name: 'How do breadcrumbs work' },
    ]
  }),
  defineBreadcrumb({
    '@id': '#secondary-breadcrumb',
    itemListElement: [
      // item is the url and will be resolved to the absolute url  
      { name: 'Sub Home', item: '/sub' },
      { name: 'Sub Page', item: '/sub/page' },
      { name: 'Sub Element' },
    ]
  }),
])
</script>
```
