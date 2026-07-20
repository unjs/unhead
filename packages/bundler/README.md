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
    precompile?: boolean | {
      consumer?: 'client' | 'server'
    }
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

`experimental.precompile` targets the sealed `unhead/precompiled/client` and `unhead/precompiled/server` entries. It replaces eligible inputs with module-hoisted plans containing normalized attributes, priority, dedupe identity, sanitized content, and tag position. Server plans contain final HTML; client plans contain DOM-ready records and keep entry disposal for navigation.

```ts
import { createHead, renderSSRHead, useHead } from 'unhead/precompiled/server'

const head = createHead()
useHead({ title: 'Product' }, { head })
const html = renderSSRHead(head)
```

```ts
import { createHead, useHead } from 'unhead/precompiled/client'

const head = createHead()
const entry = useHead({ title: 'Product' }, { head })
entry.dispose()
```

These are compile-or-error targets. They support JSON-compatible object literals, static `useSeoMeta()`, static priorities/positions, plain HTML/body attributes, and scalar arrayable SEO metadata. Server rendering is always compact.

The build fails with a file and line number for dynamic values, spreads, getters, computed keys, patches, entry options other than `{ head }`, title templates, explicit tag keys, class/style attributes, invalid tag positions, `templateParams`, `processTemplateParams`, custom duplicate strategies, or repeated arrayable identities. Server entry handles cannot be observed; client entries expose `dispose()` only. The sealed heads do not expose hooks, plugins, custom weights/resolvers, raw `init`, framework adapters, or streaming replay.

Imports from `unhead`, `unhead/client`, `unhead/server`, and framework packages are left alone. A client/server sealed-entry mismatch fails the build, so one target cannot silently ship the other target's runtime.

Vite detects client and SSR builds automatically. With plain Rollup or another target-opaque bundler, set `experimental: { precompile: { consumer: 'client' } }` or `consumer: 'server'`.

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
