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
      client?: 'eager' | 'csr' | 'deferred'
      duplicates?: 'runtime' | 'error'
      mode?: 'runtime' | 'snapshot'
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

`experimental.precompile` targets the sealed core and framework `/precompiled` entries. It replaces eligible inputs with module-hoisted plans containing normalized attributes, priority, dedupe identity, sanitized content, and tag position. Server plans contain final HTML; client plans contain DOM-ready records and keep framework lifecycle disposal.

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

Client profiles are selected in the build config:

- `client: 'eager'` adopts SSR elements and is the default.
- `client: 'csr'` is smaller for SPA-only pages because it never scans or adopts initial DOM nodes.
- `client: 'deferred'` starts loading the DOM runtime immediately in an async chunk, keeps the SSR head authoritative meanwhile, queues pushes, and replays them when the chunk resolves. It reduces the initial chunk rather than total transfer; do not use it on pages without an SSR head.
- `mode: 'snapshot'` finalizes one non-escaping core head at build time and removes lifecycle/disposal.
- `duplicates: 'error'` rejects duplicate identities across transformed modules, including lazy chunks. The core server then emits identity-free plans and cannot expose `resolveTags()`; the eager core client skips its winner map. This profile is rejected by framework, CSR, and deferred adapters.

Vue, React, Solid, and Svelte expose neutral `/precompiled` imports. The bundler rewrites them to the matching server, eager client, CSR client, or deferred client adapter while retaining framework setup and cleanup.

The build fails with a file and line number for dynamic values, spreads, getters, computed keys, patches, entry options other than `{ head }`, title templates, explicit tag keys, class/style attributes, invalid tag positions, `templateParams`, `processTemplateParams`, custom duplicate strategies, or repeated arrayable identities. Server and framework entry handles cannot be observed; core lifecycle client entries expose `dispose()` only. The sealed heads do not expose hooks, plugins, custom weights/resolvers, raw `init`, or streaming replay.

Snapshot mode additionally requires exactly one `const head = createHead()`-style local binding followed immediately by its static calls. The head cannot escape or be used through a framework adapter. Its server payload is shared and must be treated as immutable. Streaming and precompile modes cannot be enabled together.

Imports from `unhead`, `unhead/client`, `unhead/server`, and framework packages are left alone. A client/server sealed-entry mismatch fails the build, so one target cannot silently ship the other target's runtime.

Target-specific profile subpaths are output contracts, not an alternative to configuration. A direct CSR, deferred, snapshot, or unique import fails unless its matching precompile option is selected.

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
