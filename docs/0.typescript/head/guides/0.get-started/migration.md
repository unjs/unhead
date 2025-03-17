---
title: Migrate Your TypeScript App To Unhead v2
description: Learn about how to migrate to TypeScript Unhead v2 from v1.
navigation:
  title: Upgrade Guide
---

## Introduction

With the release of Unhead v2, we now have first-class support for other frameworks. However, this guide will focus on
the changes that affec TypeScript users.

The high-level of Unhead v2 was to remove deprecations and remove the implicit context implementation.

### Legacy Support

Unhead v2 is mostly fully backwards compatible with Unhead v1.

While not recommended, if upgrading is not possible for you, you can change your imports to the following:

```diff [TypeScript]
-import { createServerHead, useHead } from 'unhead'
+import { createServerHead, useHead } from 'unhead/legacy'
```

This will be removed in a future minor version, so you should lock your dependencies to the version that works for you.

## Client / Server Subpath Exports

🚦 Impact Level: Critical

::tip
Nuxt should not be effected by this change.
::

**⚠️ Breaking Changes:**

- `createServerHead()`{lang="ts"} and `createHead()`{lang="ts"} exports from `unhead` are removed

The path where you import `createHead` from has been updated to be a subpath export.

Please follow the updated installation instructions or simply update the import to use the subpath.

**Client bundle:**

```diff
-import { createServerHead } from 'unhead'
+import { createHead } from 'unhead/client'

// avoids bundling server plugins
createHead()
```

**Server bundle:**

```diff
-import { createServerHead } from 'unhead'
+import { createHead } from 'unhead/server'

// avoids bundling server plugins
-createServerHead()
+createHead()
```

## Removed Implicit Context

🚦 Impact Level: Critical

::tip
Nuxt should not be effected by this change.
::

**⚠️ Breaking Changes:**

- `getActiveHead()`{lang="ts"}, `activeHead`{lang="ts"} exports are removed

The implicit context implementation kept a global instance of Unhead available so that you could use the `useHead()`{lang="ts"} composables
anywhere in your application.

```ts
useHead({
  title: 'This just worked!'
})
```

While safe client side, this was a leaky abstraction server side and led to memory leaks in some cases.

In v2, the core composables no longer have access to the Unhead instance. Instead, you must pass the Unhead instance to the composables.

::note
Passing the instance is only relevant if you're importing from `unhead`. In JavaScript frameworks we tie the context to the framework itself so you
don't need to worry about this.
::

::code-group

```ts [TypeScript v2]
import { useHead } from 'unhead'

// example of getting the instance
const unheadInstance = useMyApp().unhead
useHead(unheadInstance, {
  title: 'Looks good'
})
```

```ts [TypeScript v1]
import { useHead } from 'unhead'

useHead({
  title: 'Just worked! But with SSR issues'
})
```

::

## Removed `vmid`, `hid`, `children`, `body`

🚦 Impact Level: High

For legacy support with Vue Meta we allowed end users to provide deprecated properties:  `vmid`, `hid`, `children` and `body`.

You must either update these properties to the appropriate replacement, remove them, or you can use the `DeprecationsPlugin`.

**Meta tags with `vmid`, `hid`**

These are already deduped magically so you can safely remove them there.

```diff
useHead({
  meta: [{
    name: 'description',
-   vmid: 'description'
-   hid: 'description'
  }]
})
```

**Other Tags with `vmid`, `hid`**

Use `key` if you need the deduplication feature. This is useful for tags that may change from server to client
rendering.

```diff
useHead({
  script: [{
-   vmid: 'my-key'
-   hid: 'my-key'
+   key: 'my-key',
  }]
})
```

**Using `children`**

The `children` key is a direct replacement of `innerHTML` which you should use instead.

::Caution
When migrating your code ensure that you're not dynamically setting `innerHTML` as this can lead to XSS vulnerabilities.
::

```diff
useHead({
  script: [
      {
-        children: '..'
+        innerHTML: '..'
      }
   ]
})
```

**Using `body`**

The `body` key should be updated to use the Tag Position feature.

```diff
useHead({
  script: [
      {
-        body: true
+        tagPosition: 'bodyClose'
      }
   ]
})
```

**Use Deprecations Plugin**

```ts
import { createHead } from 'unhead'
import { DeprecationsPlugin } from 'unhead/plugins'

const unhead = createHead({
  plugins: [DeprecationsPlugin]
})
```

## Opt-in Template Params & Tag Alias Sorting

🚦 Impact Level: High

To reduce the bundle size and improve performance, we've moved the template params and tag alias sorting to optional plugins.

If you'd like to continue using these, please opt-in to the plugins.

```ts
import { AliasSortingPlugin, TemplateParamsPlugin } from 'unhead/plugins'

createHead({
  plugins: [TemplateParamsPlugin, AliasSortingPlugin]
})
```

## Vue 2 Support

🚦 Impact Level: Critical

Unhead v2 no longer supports Vue v2. If you're using Vue v2, you will need to lock your dependencies to the latest v1 version of Unhead.

## Promise Input Support

🚦 Impact Level: Medium

If you have promises as input they will no longer be resolved, either await the promise before passing it along or register the optional promises plugin.

**Option 1: Await Promise**

```diff
useHead({
  link: [
    {
-     href: import('~/assets/MyFont.css?url'),
+     href: await import('~/assets/MyFont.css?url'),
      rel: 'stylesheet',
      type: 'text/css'
    }
  ]
})
```

**Option 2: Promise Plugin**

```ts
import { PromisePlugin } from 'unhead/plugins'

const unhead = createHead({
  plugins: [PromisePlugin]
})
```

## Updated `useScript()`{lang="ts"}

🚦 Impact Level: High

**⚠️ Breaking Changes:**

- Script instance is no longer augmented as a proxy and promise
- `script.proxy`{lang="ts"} is rewritten for simpler, more stable behavior
- `stub()`{lang="ts"} and runtime hook `script:instance-fn` are removed

**Replacing promise usage**

If you're using the script as a promise you should instead opt to use the `onLoaded()` functions.

```diff
const script = useScript()

-script.then(() => console.log('loaded')
+script.onLoaded(() => console.log('loaded'))
```

**Replacing proxy usage**

If you're accessing the underlying API directly from the script instance, you will now need to only access it from the `.proxy`.

```diff
const script = useScript('..', {
  use() { return { foo: [] } }
})

-script.foo.push('bar')
+script.proxy.foo.push('bar')
```

**Replacing `stub()`**

If you were using stub for anything you should replace this with either custom `use()` behavior.

```diff
const script = useScript('...', {
-  stub() { return { foo: import.meta.server ? [] : undefined } }
})

+script.proxy = {} // your own implementation
```

## Tag Sorting Updated

🚦 Impact Level: :UBadge{color="success" variant="subtle" size="sm" label="Low"}

An optional [Capo.js](https://rviscomi.github.io/capo.js/) plugin was added to Unhead, in v2 we make this the default sorting behavior.

::warning
As all head tags may be re-ordered this will break any snapshot tests that you have in place and in some rare cases may lead to performance regressions.
::

You can opt-out of Capo.js sorting by providing the option.

```ts
createHead({
  disableCapoSorting: true,
})
```

## Default SSR Tags

🚦 Impact Level: Low

When SSR Unhead will now insert important default tags for you:
- `<meta charset="utf-8">`
- `<meta name="viewport" content="width=device-width, initial-scale=1">`
- `<html lang="en">`

If you were previously relying on these being left empty, you may need to either disable them by using `disableDefaultTags` or insert tags
to override them.

```ts
import { createHead, useHead } from 'unhead/server'

// disable when creating the head instance
const head = createHead({
  disableDefaults: true,
})

useHead(head, {
  htmlAttrs: {
    lang: 'fr'
  }
})
```

## CJS Exports Removed

🚦 Impact Level: Low

CommonJS exports have been removed in favor of ESM only.

```diff
-const { createHead } = require('unhead/client')
+import { createHead } from 'unhead/client'
```

## Deprecated `@unhead/schema`

🚦 Impact Level: Low

The `@unhead/schema` package is now deprecated and will be removed in a future version. You should instead import
the schema from `unhead/types` or `unhead`.

```diff
-import { HeadTag } from '@unhead/schema'
+import { HeadTag } from 'unhead/types'
```
