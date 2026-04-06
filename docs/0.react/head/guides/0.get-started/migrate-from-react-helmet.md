---
title: Migrating from React Helmet to Unhead
description: 'Replace React Helmet with Unhead - 60% smaller bundle (4.5kb gzipped), automatic Capo.js tag sorting, TypeScript support, and modern head management.'
navigation:
  title: 'Migrate React Helmet'
---

**Quick Answer:** For the fastest migration, swap your import to `@unhead/react/helmet` — it provides a drop-in `<Helmet>` component with the same API. Or replace `<Helmet>` with `useHead()` or `<Head>` for the full Unhead experience.

## Why Migrate from React Helmet?

[React Helmet](https://github.com/nfl/react-helmet) was the go-to solution for managing `<head>` tags in React applications for years. However, its last major release was in 2020 and the project is now in maintenance mode.

::tip{icon="i-heroicons-scale"}
**Bundle size:** React Helmet 26.6 kB (9.2 kB gzipped) → Unhead 10.7 kB (4.5 kB gzipped) — **60% smaller**
::

[Unhead](/) offers a modern alternative with:

- Full TypeScript safety
- DOM event handlers
- Advanced DOM patching algorithm built for reactive frameworks
- Automatic [Capo.js-based tag sorting](/docs/head/guides/core-concepts/positions) for optimal page load performance
- Ecosystem of extras: `useSchemaOrg()`{lang="ts"}, `useScript()`{lang="ts"}, and more

## What's the Difference Between React Helmet and Unhead?

React Helmet uses a `<Helmet>` component to manage head tags. Unhead provides a `<Head>` component, offering a similar
API.

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

## How Do I Migrate from React Helmet to Unhead?

### Quick Migration with `@unhead/react/helmet`

For the fastest migration path, Unhead provides a drop-in `<Helmet>` component that supports the same API as react-helmet — including `defaultTitle`, `titleTemplate`, and `onChangeClientState`.

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

That's it — your existing `<Helmet>` usage will work as-is. On the client, `<Helmet>` automatically creates and manages a head instance, so no provider is needed. The `defaultTitle`, `titleTemplate`, and `onChangeClientState` props are all supported.

::note
For SSR, you still need to wrap your app with `<UnheadProvider>` so you can pass the head instance to `renderSSRHead()`. See [Update Server Rendering](#_4-update-server-rendering) below.
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
The `encodeSpecialCharacters` and `defer` props are accepted for compatibility but have no effect — Unhead handles these automatically.
::

### 3. Full Migration to `<Head>` (Optional)

If you'd prefer to adopt the Unhead API directly, replace `<Helmet>` with `<Head>`:

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

### 5. What's Next?

You've successfully migrated from React Helmet to Unhead.

Check out some of the Unhead concepts:

- [Tag Placement](/docs/head/guides/core-concepts/positions)
- [DOM Event Handling](/docs/head/guides/core-concepts/dom-event-handling)
- [Handling Duplicates](/docs/head/guides/core-concepts/handling-duplicates)

## Need Help?

If you run into issues during migration:

- File an issue on [GitHub](https://github.com/unjs/unhead)
- Join our [Discord community](https://discord.gg/unjs)
