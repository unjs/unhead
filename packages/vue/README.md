# @unhead/vue

> Full-stack `<head>` management for Vue applications

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]

## Features

- 🖖 Vue-optimized head management
- 🔄 Reactive titles, meta tags, and other head elements
- 🔍 SEO-friendly head control
- 🖥️ Server-side rendering support
- 📦 Lightweight with zero dependencies (except for Vue & unhead)

## Installation

```bash
# npm
npm install @unhead/vue

# yarn
yarn add @unhead/vue

# pnpm
pnpm add @unhead/vue
```

## Usage

### Setup

#### Client-side (SPA)

```ts
import { createHead } from '@unhead/vue/client'
// main.ts
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
const head = createHead()
app.use(head)

app.mount('#app')
```

#### Server-side (SSR)

```ts
import { createHead } from '@unhead/vue/server'
// entry-server.ts
import { renderToString } from 'vue/server-renderer'
import { createApp } from './main'

export async function render(url: string) {
  const { app } = createApp()
  const head = createHead()
  app.use(head)

  const html = await renderToString(app)
  return { html, head }
}
```

```ts
import { createHead } from '@unhead/vue/client'
// entry-client.ts (for hydration)
import { createApp } from './main'

const { app } = createApp()
const head = createHead()
app.use(head)

app.mount('#app')
```

### Basic Usage

```vue
<!-- Home.vue -->
<script setup lang="ts">
import { useHead } from '@unhead/vue'

useHead({
  title: 'Home Page',
  meta: [
    {
      name: 'description',
      content: 'Welcome to our website'
    }
  ]
})
</script>

<template>
  <h1>Home</h1>
</template>
```

### Setting Meta Tags

```vue
<!-- About.vue -->
<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue'

useSeoMeta({
  title: 'About Us',
  description: 'Learn more about our company',
  ogTitle: 'About Our Company',
  ogDescription: 'Our fantastic about page',
  ogImage: 'https://example.com/image.jpg',
})
</script>

<template>
  <h1>About Us</h1>
</template>
```

### Reactive Head Elements

```vue
<!-- Profile.vue -->
<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { ref } from 'vue'

const userName = ref('User')

// Vue automatically tracks reactive changes
useHead({
  title: () => `${userName.value} - Profile`, // Reactive title
  meta: [
    {
      name: 'description',
      content: () => `${userName.value}'s profile page`, // Reactive description
    },
  ],
})

function updateName() {
  userName.value = 'New Name'
  // Title and meta automatically update!
}
</script>

<template>
  <h1>{{ userName }}'s Profile</h1>
  <button @click="updateName">
    Update Name
  </button>
</template>
```

## Development

```bash
# Install dependencies
npm install

# Generate build files
npm run build

# Run tests
npm run test
```

## License

[MIT](./LICENSE)

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@unhead/vue/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/@unhead/vue

[npm-downloads-src]: https://img.shields.io/npm/dm/@unhead/vue.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/@unhead/vue

[license-src]: https://img.shields.io/github/license/unjs/unhead.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://github.com/unjs/unhead/blob/main/LICENSE
