# Migration Guide: Unhead v3

This guide helps you migrate from deprecated APIs to their modern replacements in Unhead v3. Sections are ordered by likelihood of affecting your application.

## Automated Migration Checks

Add `ValidatePlugin` during your upgrade to automatically detect v2 patterns and get actionable warnings:

```ts
import { ValidatePlugin } from 'unhead/plugins'

const head = createHead({
  plugins: [
    ValidatePlugin() // Detects deprecated props, missing plugins, and more
  ]
})
```

The plugin will warn you about:
- **Missing `TemplateParamsPlugin`** — template params like `%siteName` are now opt-in and will appear literally without the plugin
- **Missing `AliasSortingPlugin`** — `before:`/`after:` tag priorities are now opt-in and will be silently ignored without the plugin
- **Deprecated property names** — `children`, `hid`, `vmid`, `body: true` are no longer auto-converted

All rules use ESLint-style config and can be individually disabled:

```ts
ValidatePlugin({
  rules: {
    'missing-template-params-plugin': 'off',
  }
})
```

Remove `ValidatePlugin` once your migration is complete, or keep it for ongoing validation.

---

## Table of Contents

1. [Legacy Property Names](#1-legacy-property-names) - High Impact
2. [Schema.org Plugin](#2-schemaorg-plugin) - High Impact
3. [Server Composables](#3-server-composables) - Medium-High Impact
4. [Vue Legacy Exports](#4-vue-legacy-exports) - Medium Impact
5. [Core API Changes](#5-core-api-changes) - Medium Impact
6. [Schema.org Config Options](#6-schemaorg-config-options) - Low-Medium Impact
7. [Server Utilities](#7-server-utilities) - Low Impact
8. [Type Changes](#8-type-changes) - Low Impact
9. [Hooks](#9-hooks) - Low Impact
10. [Other Removed APIs](#10-other-removed-apis) - Low Impact

---

## 1. Legacy Property Names

**Impact: High** - Many existing codebases use these legacy property names.

The `DeprecationsPlugin` that automatically converted legacy property names has been removed. You must update your head entries to use the current property names.

### `children` → `innerHTML`

```diff
head.push({
  script: [{
-   children: 'console.log("hello")',
+   innerHTML: 'console.log("hello")',
  }]
})
```

### `hid` / `vmid` → `key`

```diff
head.push({
  meta: [{
-   hid: 'description',
+   key: 'description',
    name: 'description',
    content: 'My description'
  }]
})
```

```diff
head.push({
  meta: [{
-   vmid: 'og:title',
+   key: 'og:title',
    property: 'og:title',
    content: 'My Title'
  }]
})
```

### `body: true` → `tagPosition: 'bodyClose'`

```diff
head.push({
  script: [{
    src: '/script.js',
-   body: true,
+   tagPosition: 'bodyClose',
  }]
})
```

### Quick Reference

| Old Property | New Property |
|-------------|--------------|
| `children` | `innerHTML` |
| `hid` | `key` |
| `vmid` | `key` |
| `body: true` | `tagPosition: 'bodyClose'` |

---

## 2. Schema.org Plugin

**Impact: High** - Anyone using `@unhead/schema-org` will need to update.

The `PluginSchemaOrg` and `SchemaOrgUnheadPlugin` exports have been removed. Use `UnheadSchemaOrg` instead.

```diff
- import { PluginSchemaOrg } from '@unhead/schema-org'
+ import { UnheadSchemaOrg } from '@unhead/schema-org'

const head = createHead({
  plugins: [
-   PluginSchemaOrg()
+   UnheadSchemaOrg()
  ]
})
```

```diff
- import { SchemaOrgUnheadPlugin } from '@unhead/schema-org'
+ import { UnheadSchemaOrg } from '@unhead/schema-org'

const head = createHead({
  plugins: [
-   SchemaOrgUnheadPlugin()
+   UnheadSchemaOrg()
  ]
})
```

For Vue users:

```diff
- import { PluginSchemaOrg } from '@unhead/schema-org/vue'
+ import { UnheadSchemaOrg } from '@unhead/schema-org/vue'
```

---

## 3. Server Composables

**Impact: Medium-High** - Common in SSR applications.

The `useServerHead`, `useServerHeadSafe`, and `useServerSeoMeta` composables have been removed. Use the standard composables instead.

### `useServerHead` → `useHead`

```diff
- import { useServerHead } from 'unhead'
+ import { useHead } from 'unhead'

- useServerHead({ title: 'My Page' })
+ useHead({ title: 'My Page' })
```

### `useServerHeadSafe` → `useHeadSafe`

```diff
- import { useServerHeadSafe } from 'unhead'
+ import { useHeadSafe } from 'unhead'

- useServerHeadSafe({ title: userInput })
+ useHeadSafe({ title: userInput })
```

### `useServerSeoMeta` → `useSeoMeta`

```diff
- import { useServerSeoMeta } from 'unhead'
+ import { useSeoMeta } from 'unhead'

- useServerSeoMeta({ description: 'My description' })
+ useSeoMeta({ description: 'My description' })
```

**Note:** If you need server-only head management, use conditional logic or framework-specific SSR detection instead of mode-based composables.

---

## 4. Vue Legacy Exports

**Impact: Medium** - Affects Vue users on older setups.

### `/legacy` Export Path Deprecated

The `@unhead/vue/legacy` import still works but emits a runtime deprecation warning. Update to the explicit client or server import:

```diff
- import { createHead } from '@unhead/vue/legacy'
+ import { createHead } from '@unhead/vue/client'
// or for SSR
+ import { createHead } from '@unhead/vue/server'
```

### `createHeadCore` Removed

```diff
- import { createHeadCore } from '@unhead/vue'
+ import { createHead } from '@unhead/vue/server'
// or for client
+ import { createHead } from '@unhead/vue/client'
```

---

## 5. Core API Changes

**Impact: Medium** - Affects custom integrations and advanced usage.

### `createHeadCore` → `createUnhead`

```diff
- import { createHeadCore } from 'unhead'
+ import { createUnhead } from 'unhead'

- const head = createHeadCore()
+ const head = createUnhead()
```

### `headEntries()` → `entries` Map

The `headEntries()` method has been removed. Access entries directly via the `entries` Map.

```diff
- const entries = head.headEntries()
+ const entries = [...head.entries.values()]
```

### `mode` Option Removed

The `mode` option on head entries has been removed. Runtime mode detection is no longer supported.

```diff
head.push({
  title: 'My Page',
- }, { mode: 'server' })
+ })
```

If you need server-only or client-only head management, use the appropriate `createHead` function:

```ts
// Client-side
import { createHead } from 'unhead/client'

// Server-side
import { createHead } from 'unhead/server'
```

---

## 6. Schema.org Config Options

**Impact: Low-Medium** - Affects users with custom Schema.org configuration.

The following Schema.org config options have been removed:

| Removed Option | Replacement |
|---------------|-------------|
| `canonicalHost` | `host` |
| `canonicalUrl` | `path` + `host` |
| `position` | Use `tagPosition` on individual schema entries |
| `defaultLanguage` | Use `inLanguage` on schema nodes |
| `defaultCurrency` | Use `priceCurrency` on schema nodes |

```diff
UnheadSchemaOrg({
- canonicalHost: 'https://example.com',
- canonicalUrl: 'https://example.com/page',
+ host: 'https://example.com',
+ path: '/page',
})
```

---

## 7. Server Utilities

**Impact: Low** - Only affects users parsing HTML for head extraction.

### `extractUnheadInputFromHtml` → `parseHtmlForUnheadExtraction`

The function has been moved from `unhead/server` to `unhead/parser`.

```diff
- import { extractUnheadInputFromHtml } from 'unhead/server'
+ import { parseHtmlForUnheadExtraction } from 'unhead/parser'

- const { input } = extractUnheadInputFromHtml(html)
+ const { input } = parseHtmlForUnheadExtraction(html)
```

---

## 8. Type Changes

**Impact: Low** - Only affects TypeScript users with explicit type imports.

### Removed Type Aliases

| Removed Type | Replacement |
|-------------|-------------|
| `Head` | `HeadTag` or specific tag types |
| `ResolvedHead` | `ResolvedHeadTag` |
| `MergeHead` | Use generics directly |
| `MetaFlatInput` | `MetaFlat` |
| `ResolvedMetaFlat` | `MetaFlat` |
| `RuntimeMode` | Removed (no replacement needed) |

```diff
- import type { Head, MetaFlatInput, RuntimeMode } from 'unhead'
+ import type { HeadTag, MetaFlat } from 'unhead'
```

---

## 9. Hooks

**Impact: Low** - Only affects users with custom hook implementations.

### `init` Hook Removed

The `init` hook has been removed from `HeadHooks`.

```diff
- head.hooks.hook('init', (ctx) => {
-   // Initialize something
- })
```

### `dom:renderTag` Hook Removed

The `dom:renderTag` hook has been removed. This hook was called for each tag during DOM rendering.

```diff
- head.hooks.hook('dom:renderTag', (ctx, document, track) => {
-   // Custom tag rendering logic
- })
```

### `dom:rendered` Hook Removed

The `dom:rendered` hook has been removed. DOM rendering is now synchronous.

```diff
- head.hooks.hook('dom:rendered', ({ renders }) => {
-   // Post-render logic
- })
```

If you need to run logic after DOM rendering, call `renderDOMHead` directly and add your logic after:

```ts
import { renderDOMHead } from 'unhead/client'

renderDOMHead(head)
// Your post-render logic here
```

### `dom:beforeRender` is Now Synchronous

The `dom:beforeRender` hook no longer supports async handlers.

```diff
head.hooks.hook('dom:beforeRender', (ctx) => {
-   await someAsyncOperation()
    ctx.shouldRender = true
})
```

### `renderDOMHead` is Now Synchronous

The `renderDOMHead` function no longer returns a Promise.

```diff
- await renderDOMHead(head, { document })
+ renderDOMHead(head, { document })
```

---

## 10. Other Removed APIs

**Impact: Low** - Internal utilities rarely used directly.

### `resolveScriptKey`

The `resolveScriptKey` function is no longer exported. This was an internal utility.

### `resolveUnrefHeadInput` (Vue)

```diff
- import { resolveUnrefHeadInput } from '@unhead/vue'
```

Reactive head input resolution now happens automatically within the head manager.

### `setHeadInjectionHandler` (Vue)

```diff
- import { setHeadInjectionHandler } from '@unhead/vue'
- setHeadInjectionHandler(() => myHead)
```

Head injection is now handled automatically.

### `DeprecationsPlugin`

```diff
- import { DeprecationsPlugin } from 'unhead/plugins'
```

Instead of using this plugin, update your code to use the current property names (see [Section 1](#1-legacy-property-names)).

---

## Quick Reference: Import Changes

```diff
// Legacy properties - update property names directly, no plugin needed
- import { DeprecationsPlugin } from 'unhead/plugins'

// Schema.org
- import { PluginSchemaOrg, SchemaOrgUnheadPlugin } from '@unhead/schema-org'
+ import { UnheadSchemaOrg } from '@unhead/schema-org'

// Server composables
- import { useServerHead, useServerHeadSafe, useServerSeoMeta } from 'unhead'
+ import { useHead, useHeadSafe, useSeoMeta } from 'unhead'

// Core
- import { createHeadCore } from 'unhead'
+ import { createUnhead } from 'unhead'

// Server utilities
- import { extractUnheadInputFromHtml } from 'unhead/server'
+ import { parseHtmlForUnheadExtraction } from 'unhead/parser'

// Vue
- import { createHeadCore, resolveUnrefHeadInput, setHeadInjectionHandler } from '@unhead/vue'
- import { ... } from '@unhead/vue/legacy'
+ import { createHead } from '@unhead/vue/client'
+ import { createHead } from '@unhead/vue/server'
```

---

## Need Help?

If you encounter issues during migration:

1. Check the [documentation](https://unhead.unjs.io)
2. Search [existing issues](https://github.com/unjs/unhead/issues)
3. Open a [new issue](https://github.com/unjs/unhead/issues/new) if needed
