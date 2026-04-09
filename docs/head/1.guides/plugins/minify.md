---
title: "Minify"
description: "Minify inline script and style tag content during SSR rendering. Zero-dependency lightweight minifiers for edge and serverless, with support for custom minifiers."
navigation.title: "Minify"
---

**Quick Answer:** The Minify plugin strips comments, collapses whitespace, and minifies inline `<script>` and `<style>` content during SSR rendering. It uses lightweight pure-JS minifiers by default — zero native dependencies, safe for edge and serverless.

## What Does This Plugin Do?

The Minify plugin hooks into the SSR render pipeline and minifies:

- **Inline scripts** — strips comments, collapses whitespace, preserves string literals and ASI safety
- **Inline styles** — strips comments, collapses whitespace, removes trailing semicolons, strips leading zeros
- **JSON-LD / application/json** — re-serializes to remove pretty-printing whitespace

It automatically skips `speculationrules` and `importmap` script types, and never increases content length.

## How Do I Set Up the Plugin?

Register the plugin when creating your head instance:

::code-block
```ts [Input]
import { MinifyPlugin } from '@unhead/dynamic-import/plugins'

const head = createHead({
  plugins: [
    MinifyPlugin()
  ]
})
```
::

## What Options Can I Configure?

::code-block
```ts [Input]
export interface MinifyPluginOptions {
  /**
   * Custom JS minifier function. Set to `false` to disable JS minification.
   * Defaults to built-in lightweight minifier.
   */
  js?: false | ((code: string) => string)
  /**
   * Custom CSS minifier function. Set to `false` to disable CSS minification.
   * Defaults to built-in lightweight minifier.
   */
  css?: false | ((code: string) => string)
  /**
   * Minify JSON script types (application/ld+json, application/json).
   * @default true
   */
  json?: boolean
}
```
::

### Disable Specific Minifiers

::code-block
```ts [Input]
MinifyPlugin({
  js: false,   // skip script minification
  json: false, // skip JSON-LD minification
})
```
::

### Custom Minifiers

Provide your own synchronous minifier function for heavier optimization:

::code-block
```ts [Input]
MinifyPlugin({
  js: (code) => myCustomJSMinify(code),
  css: (code) => myCustomCSSMinify(code),
})
```
::

Note: The `ssr:render` hook runs synchronously, so custom minifiers must be synchronous.

## Build-Time Minification

For build-time minification of static string literals inside `useHead()` / `useServerHead()` calls, enable the `minify` option on the [unified Vite plugin](/docs/head/guides/build-plugins/minify-transform). This runs at build time using heavier tools (rolldown/esbuild for JS, lightningcss for CSS) that never enter your SSR runtime bundle.

::code-block
```ts [vite.config.ts]
import vue from '@vitejs/plugin-vue'
import { Unhead } from '@unhead/vue/vite'
import { createJSMinifier } from '@unhead/bundler/minify/rolldown'
import { createCSSMinifier } from '@unhead/bundler/minify/lightningcss'

export default defineConfig({
  plugins: [
    vue(),
    Unhead({
      minify: {
        js: createJSMinifier(),
        css: createCSSMinifier(),
      },
    }),
  ],
})
```
::

Available minifier backends:

| Package | Function | Use case |
|---------|----------|----------|
| `@unhead/bundler/minify/rolldown` | `createJSMinifier()` | JS minification (Vite 8+) |
| `@unhead/bundler/minify/esbuild` | `createJSMinifier()` | JS minification (Vite 7) |
| `@unhead/bundler/minify/lightningcss` | `createCSSMinifier()` | CSS minification |

## Standalone Minifier Utilities

The built-in minifiers are also available as standalone functions for use in custom build pipelines:

::code-block
```ts [Input]
import { minifyCSS, minifyJS, minifyJSON } from '@unhead/dynamic-import/minify'

const minifiedJS = minifyJS('// comment\nvar x = 1;')
const minifiedCSS = minifyCSS('body { margin: 0; }')
const minifiedJSON = minifyJSON('{ "name": "test" }')
```
::

## Related

- [Build Plugins](/docs/head/guides/build-plugins/overview) - Vite and Webpack build optimizations
- [Validate Plugin](/docs/head/guides/plugins/validate) - Catch common SEO and head tag mistakes
- [Inner Content](/docs/head/guides/core-concepts/inner-content) - Working with innerHTML and textContent
