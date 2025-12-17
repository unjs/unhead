# @unhead/addons

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
npm install @unhead/addons

# yarn
yarn add @unhead/addons

# pnpm
pnpm add @unhead/addons
```

## Usage

### Vite Plugin

```ts
import UnheadVite from '@unhead/addons/vite'
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    UnheadVite({
      // Options
    })
  ]
})
```

### Webpack Plugin

```js
// webpack.config.js
const UnheadWebpack = require('@unhead/addons/webpack')

module.exports = {
  plugins: [
    UnheadWebpack({
      // Options
    })
  ]
}
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
[npm-version-src]: https://img.shields.io/npm/v/@unhead/addons/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/@unhead/addons

[npm-downloads-src]: https://img.shields.io/npm/dm/@unhead/addons.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/@unhead/addons

[license-src]: https://img.shields.io/github/license/unjs/unhead.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://github.com/unjs/unhead/blob/main/LICENSE
