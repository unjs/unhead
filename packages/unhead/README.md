# unhead

> Full-stack `<head>` manager built for any framework

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]

## Features

- 🚀 Framework agnostic - works with any framework
- 🔄 Reactive head management
- 🔍 SEO-friendly with rich meta tag support
- 🖥️ Server-side rendering support
- 📦 Lightweight and tree-shakable
- ⚡ Performance optimized with minimal runtime overhead
- 🎯 Type-safe with full TypeScript support

## Installation

```bash
# npm
npm install unhead

# yarn
yarn add unhead

# pnpm
pnpm add unhead
```

## Usage

### Basic Usage

```ts
import { createHead, useHead } from 'unhead'

// Create a head instance
const head = createHead()

// Use head tags
useHead({
  title: 'My App',
  meta: [
    {
      name: 'description',
      content: 'My awesome application'
    }
  ]
}, { head })
```

### Server-Side Rendering

```ts
import { createHead, renderSSRHead } from 'unhead/server'

const head = createHead()

// Add head entries
useHead({
  title: 'SSR App',
  meta: [{ name: 'description', content: 'Server-rendered app' }]
}, { head })

// Render head tags
const { headTags, bodyTags } = await renderSSRHead(head)
```

### Client-Side Hydration

```ts
import { createHead, renderDOMHead } from 'unhead/client'

const head = createHead()

// Enable DOM rendering
renderDOMHead(head)

// Add reactive head entries
useHead({
  title: 'Client App'
}, { head })
```

## Framework Integrations

Unhead provides optimized integrations for popular frameworks:

- **Vue**: [`@unhead/vue`](../vue)
- **React**: [`@unhead/react`](../react)
- **Angular**: [`@unhead/angular`](../angular)
- **Svelte**: [`@unhead/svelte`](../svelte)
- **SolidJS**: [`@unhead/solid-js`](../solid-js)

## Documentation

Visit the [documentation site](https://unhead.unjs.io/) for comprehensive guides and API references.

## License

[MIT](./LICENSE)

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/unhead/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/unhead

[npm-downloads-src]: https://img.shields.io/npm/dm/unhead.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/unhead

[license-src]: https://img.shields.io/github/license/unjs/unhead.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://github.com/unjs/unhead/blob/main/LICENSE
