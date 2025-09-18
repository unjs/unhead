# @unhead/svelte

> Full-stack `<head>` management for Svelte applications

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]

## Features

- 🧡 Svelte-optimized head management
- 🔄 Reactive titles, meta tags, and other head elements
- 🔍 SEO-friendly head control
- 🖥️ Server-side rendering support
- 📦 Lightweight with zero dependencies (except for Svelte & unhead)

## Installation

```bash
# npm
npm install @unhead/svelte

# yarn
yarn add @unhead/svelte

# pnpm
pnpm add @unhead/svelte
```

## Usage

### Setup

#### Client-side (SPA)

```ts
// main.ts
import './app.css'
import { mount } from 'svelte'
import App from './App.svelte'
import { createHead, UnheadContextKey } from '@unhead/svelte/client'

const unhead = createHead()
const context = new Map()
context.set(UnheadContextKey, unhead)

mount(App, {
  target: document.getElementById('app')!,
  context: context
})
```

#### Server-side (SSR)

```ts
// entry-server.ts
import { render as _render } from 'svelte/server'
import App from './App.svelte'
import { createHead, UnheadContextKey } from '@unhead/svelte/server'

export function render(url: string) {
  const unhead = createHead()
  const context = new Map()
  context.set(UnheadContextKey, unhead)

  return {
    render: _render(App, { context }),
    unhead,
  }
}
```

```ts
// entry-client.ts (for hydration)
import './app.css'
import { hydrate } from 'svelte'
import App from './App.svelte'
import { createHead, UnheadContextKey } from '@unhead/svelte/client'

const unhead = createHead()
const context = new Map()
context.set(UnheadContextKey, unhead)

hydrate(App, {
  target: document.getElementById('app')!,
  context: context
})
```

### Basic Usage

```svelte
<!-- Home.svelte -->
<script>
  import { useHead } from '@unhead/svelte'

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

<h1>Home</h1>
```

### Setting Meta Tags

```svelte
<!-- About.svelte -->
<script>
  import { useSeoMeta } from '@unhead/svelte'

  useSeoMeta({
    title: 'About Us',
    description: 'Learn more about our company',
    ogTitle: 'About Our Company',
    ogDescription: 'Our fantastic about page',
    ogImage: 'https://example.com/image.jpg',
  })
</script>

<h1>About Us</h1>
```

### Reactive Head Elements

```svelte
<!-- Profile.svelte -->
<script lang="ts">
  import { useHead } from '@unhead/svelte'

  let userName = $state('User')

  const entry = useHead()
  $effect(() => {
    entry.patch({
      title: `${userName} - Profile`, // Reactive title
      meta: [
        {
          name: 'description',
          content: `${userName}'s profile page`, // Reactive description
        },
      ],
    })
  })

  function updateName() {
    userName = 'New Name'
    // Title and meta automatically update!
  }
</script>

<h1>{userName}'s Profile</h1>
<button onclick={updateName}>Update Name</button>
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
[npm-version-src]: https://img.shields.io/npm/v/@unhead/svelte/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/@unhead/svelte

[npm-downloads-src]: https://img.shields.io/npm/dm/@unhead/svelte.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/@unhead/svelte

[license-src]: https://img.shields.io/github/license/unjs/unhead.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://github.com/unjs/unhead/blob/main/LICENSE