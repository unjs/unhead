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
      consumer?: 'server'
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

`experimental.precompile` targets the sealed `unhead/precompiled/server` entry. During a server build it replaces each eligible call with a module-hoisted render plan. The plan already contains normalized attributes, CAPO priority, dedupe identity, sanitized content, tag position, and final HTML. Runtime work is limited to collecting plans, resolving execution-order duplicates, and joining strings.

```ts
import { createHead, renderSSRHead, useHead } from 'unhead/precompiled/server'

const head = createHead()
useHead({ title: 'Product' }, { head })
const html = renderSSRHead(head)
```

This is a compile-or-error target. It supports JSON-compatible object literals, static `useSeoMeta()`, package defaults, `disableDefaults`, static priorities/positions, plain HTML/body attributes, and contiguous arrayable SEO metadata grouped atomically per call. Rendering is always compact: formatting line breaks and their runtime branch are excluded.

The build fails with a file and line number for dynamic values, spreads, getters, computed keys, observed return values, patches, entry options other than `{ head }`, title templates, explicit tag keys, class/style attributes, invalid tag positions, `templateParams`, `processTemplateParams`, custom duplicate strategies, or repeated arrayable identities separated by another tag. Structured media arrays that interleave fields fall into that last category; split them into contiguous calls or use the normal server entry. The sealed head does not expose hooks, plugins, custom weights/resolvers, raw `init`, framework adapters, or streaming replay.

Imports from `unhead`, `unhead/server`, and framework packages are left alone. Client-targeted builds also skip the phase. As a result, ordinary and browser bundles do not contain the sealed runtime.

Vite detects SSR builds automatically. With plain Rollup or another bundler that cannot expose its target, use `experimental: { precompile: { consumer: 'server' } }`.

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
