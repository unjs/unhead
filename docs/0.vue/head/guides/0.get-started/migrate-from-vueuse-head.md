---
title: Migrating from @vueuse/head
description: 'Remove @vueuse/head and move its Vue composables, components, head instance, and auto-imports to @unhead/vue.'
navigation:
  title: 'Migrate VueUse Head'
---

The [`@vueuse/head` project](https://github.com/vueuse/head) now directs users to Unhead. Version 2.0.0 depends on Unhead v1, so leaving both packages installed can keep v1 in your lockfile and leave auto-imports pointing at the old package.

::warning
Unhead v2 and later require Vue 3. Vue 2 projects must use `@unhead/vue@^1` and follow the [v1 installation guide](https://v1.unhead.unjs.io/setup/vue/installation).
::

## 1. Replace the Package

Remove `@vueuse/head`, then install `@unhead/vue`:

```bash
npm remove @vueuse/head
npm install @unhead/vue
```

## 2. Update the Head Instance

For a Vue SPA or browser entry, import `createHead()`{lang="ts"} from the client entry point:

```diff
-import { createHead } from '@vueuse/head'
+import { createHead } from '@unhead/vue/client'
```

For SSR, create a fresh head for each request from the server entry point:

```diff
-import { createHead } from '@vueuse/head'
+import { createHead } from '@unhead/vue/server'
```

The [Vue installation guide](/docs/vue/head/guides/get-started/installation) shows the complete client and server setup.

## 3. Update Composable Imports

Import Vue composables from `@unhead/vue`:

```diff
-import { useHead, useHeadSafe, useSeoMeta } from '@vueuse/head'
+import { useHead, useHeadSafe, useSeoMeta } from '@unhead/vue'
```

## 4. Update the `<Head>` Component

The `<Head>` component now has its own entry point:

```diff
-import { Head } from '@vueuse/head'
+import { Head } from '@unhead/vue/components'
```

## 5. Update Auto-Imports

If you use `unplugin-auto-import`, replace the package preset with Unhead's composable list:

```diff
+import { unheadVueComposablesImports } from '@unhead/vue'

 AutoImport({
-  imports: ['vue', '@vueuse/head'],
+  imports: ['vue', unheadVueComposablesImports],
 })
```

## 6. Check Version Changes

Installing the current `@unhead/vue` release moves your app from Unhead v1 to v3. This includes client and server entry points, renamed legacy properties, and removed Vue 2 support.

Review the [Vue Upgrade Guide](/docs/vue/head/guides/get-started/migration) for the v1 to v3 API changes.

## Next Steps

- [Install Unhead with Vue](/docs/vue/head/guides/get-started/installation)
- [Upgrade between Unhead versions](/docs/vue/head/guides/get-started/migration)
- [Use the `<Head>` component](/docs/vue/head/guides/core-concepts/components)
