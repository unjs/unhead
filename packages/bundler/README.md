# @unhead/bundler

> Unhead addons for build tools and bundlers

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]

## Features

- 🛠️ Build-time optimizations for Unhead
- 🌲 Tree-shake server composables from client bundles
- ⚡ Transform `useSeoMeta` calls for better performance
- 🧊 Precompile static head entries at build time (experimental)
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
      experimental: {
        precompile: true,
      },
    })
  ]
})
```

### Options

```ts
interface UnpluginOptions {
  treeshake?: TreeshakeServerComposablesOptions | false

  transformSeoMeta?: UseSeoMetaTransformOptions | false

  minify?: MinifyTransformOptions | false

  experimental?: {
    precompile?: boolean
  }
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

### Static Head Precompilation

With `experimental.precompile` enabled, fully static `useHead()` and `useSeoMeta()` object literals are normalized during server builds. Client-targeted builds skip this phase so the carrier never becomes additive browser code. Transformed mixed-runtime modules import the opt-in `unhead/precompiled` entry, keeping its carrier and serialization code out of ordinary application bundles. Dynamic calls are left untouched, so they continue through the normal runtime path. When a precompiled entry crosses an SSR streaming boundary it serializes as an ordinary head input, so the standard streaming client remains compatible without shipping an experimental decoder.

For an all-static core SSR graph, `unhead/precompiled/server` is a strict alternative to `unhead/server`. It excludes the dynamic input normalizer and throws if an uncompiled entry reaches resolution. It is not currently a drop-in replacement for framework server entries. Raw `init` entries, plugins or hooks that push raw entries, observed `useSeoMeta()` results, and dynamic patches require the mixed runtime. Direct static patches on `const entry = useHead(...)` are precompiled. Use the regular server entry whenever any entry can be created or replaced at runtime.

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
