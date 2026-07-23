---
title: Migrating from React Helmet to Unhead
description: 'Replace React Helmet with Unhead using its Helmet compatibility component, Head component, or useHead() hook.'
navigation:
  title: 'Migrate React Helmet'
---

For the smallest initial change, swap your import to `@unhead/react/helmet`. Its compatibility component supports common React Helmet props such as `defaultTitle`, `titleTemplate`, and `onChangeClientState`. You can later replace `<Helmet>` with `useHead()` or `<Head>`.

## Why migrate

[React Helmet](https://github.com/nfl/react-helmet) has long provided `<head>` management for React applications. Its [latest tagged release, v6.1.0, was published in 2020](https://github.com/nfl/react-helmet/releases/tag/6.1.0).

[Unhead](/) adds:

- Typed head input
- DOM event handlers
- DOM patching for reactive updates
- [Capo.js-based sorting during SSR](/docs/head/guides/core-concepts/positions)
- `useSchemaOrg()`{lang="ts"} and `useScript()`{lang="ts"} integrations

## React Helmet vs Unhead

React Helmet manages tags through `<Helmet>`. Unhead's `<Head>` component provides a similar JSX API.

```tsx [React Helmet]
import { Helmet } from 'react-helmet'

function App() {
  return (
    <Helmet>
      <title>My Site</title>
      <meta name="description" content="Description" />
    </Helmet>
  )
}
```

```tsx [Unhead]
import { Head } from '@unhead/react'

function App() {
  return (
    <Head>
      <title>My Site</title>
      <meta name="description" content="Description" />
    </Head>
  )
}
```

## Migration

### Quick Migration with `@unhead/react/helmet`

Unhead provides a `<Helmet>` compatibility component for common React Helmet usage, including `defaultTitle`, `titleTemplate`, and `onChangeClientState`.

#### 1. Swap Your Dependencies

```bash
npm remove react-helmet
npm install @unhead/react
```

#### 2. Update Your Imports

```diff
-import { Helmet } from 'react-helmet'
+import { Helmet } from '@unhead/react/helmet'
```

For the supported props, your existing `<Helmet>` usage can remain unchanged. On the client, `<Helmet>` automatically creates and manages a head instance, so no provider is needed. Check custom or less common React Helmet props before treating the component as a complete API replacement.

`titleTemplate` applies to a page title. When no title exists, `defaultTitle` is emitted unchanged.

::note
For SSR, you still need to wrap your app with `<UnheadProvider>` so you can pass the head instance to `renderSSRHead()`. See [Update Server Rendering](#4-update-server-rendering) below.
::

```tsx
import { Helmet } from '@unhead/react/helmet'

function App() {
  return (
    <Helmet
      defaultTitle="My Site"
      titleTemplate="%s | My Site"
      onChangeClientState={(newState) => console.log(newState)}
    >
      <title>Page Title</title>
      <meta name="description" content="Description" />
    </Helmet>
  )
}
```

::note
The `encodeSpecialCharacters` and `defer` props are accepted for compatibility but have no effect. Unhead handles both behaviors internally.
::

### 3. Full Migration to `<Head>` (Optional)

To adopt the Unhead API directly, replace `<Helmet>` with `<Head>`:

```diff
-import { Helmet } from 'react-helmet'
+import { Head } from '@unhead/react'

function Title() {
return (
  <div>
-    <Helmet titleTemplate="%s | My Site">
-      <title>Hello World</title>
-    </Helmet>
+    <Head titleTemplate="%s | My Site">
+      <title>Hello World</title>
+    </Head>
    <h1>Hello World</h1>
  </div>
  )
}
```

### 4. Update Server Rendering

If you're using SSR, update your server code:

```tsx [src/entry-server.tsx]
import { createHead, UnheadProvider } from '@unhead/react/server'
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'

export function render(_url: string) {
  const head = createHead()
  const html = renderToString(
    <StrictMode>
      <UnheadProvider value={head}>
        <App />
      </UnheadProvider>
    </StrictMode>,
  )
  return { html, head }
}
```

## Next Steps

- [Tag Placement](/docs/head/guides/core-concepts/positions)
- [DOM Event Handling](/docs/head/guides/core-concepts/dom-event-handling)
- [Handling Duplicates](/docs/head/guides/core-concepts/handling-duplicates)

## Migration Support

- File an issue on [GitHub](https://github.com/unjs/unhead)
- Join our [Discord community](https://discord.gg/unjs)
