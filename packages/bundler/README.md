# @unhead/bundler

> Unhead addons for build tools and bundlers

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]

## Features

- 🛠️ Build-time optimizations for Unhead
- 🌲 Tree-shake server composables from client bundles
- ⚡ Transform `useSeoMeta` calls for better performance
- 📦 Support for Vite, Webpack, and other bundlers

## Installation

```bash
# npm
npm install @unhead/bundler

# yarn
yarn add @unhead/bundler

# pnpm
pnpm add @unhead/bundler
```

## Usage

### Vite Plugin

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { Unhead } from '@unhead/bundler/vite'

export default defineConfig({
  plugins: [
    Unhead({
      // Options
    })
  ]
})
```

### Options

```ts
interface UnpluginOptions {
  // Tree-shake server-only composables from client bundles
  treeshakeServerComposables?: boolean | TreeshakeServerComposablesOptions

  // Transform useSeoMeta calls for better performance
  useSeoMetaTransform?: boolean | UseSeoMetaTransformOptions
}
```

## Build Optimizations

### Tree-shake Server Composables

Automatically removes server-only Unhead composables from client bundles:

```ts
// Before (in client bundle):
import { useServerHead } from '@unhead/vue'

useServerHead({ /* ... */ })

// After (removed from client bundle):
// (code is completely removed)
```

### SEO Meta Transform

Optimizes `useSeoMeta` calls for better performance:

```ts
// Before:
useSeoMeta({
  title: 'My Page',
  description: 'Page description'
})

// After (optimized):
useHead({
  title: 'My Page',
  meta: [{ name: 'description', content: 'Page description' }]
})
```

## Documentation

Visit the [Unhead documentation](https://unhead.unjs.io/) for more details.

## License

[MIT](./LICENSE)

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@unhead/bundler/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/@unhead/bundler

[npm-downloads-src]: https://img.shields.io/npm/dm/@unhead/bundler.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/@unhead/bundler

[license-src]: https://img.shields.io/github/license/unjs/unhead.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://github.com/unjs/unhead/blob/main/LICENSE
