---
name: unhead-vue
description: Manages document head tags in Vue 3 SSR and SPA apps with @unhead/vue v3. Covers createHead from @unhead/vue/client and @unhead/vue/server, transformHtmlTemplate, useHead, useSeoMeta, useHeadSafe, useScript, VueHeadMixin, TemplateParamsPlugin, streaming SSR, and the Unhead Vite plugin. Use when a task sets a title, meta, Open Graph, canonical, or script tag in a Vue app, upgrades from @vueuse/head or Unhead v1 or v2, or hits "useHead() was called without provide context", %separator or %siteName printed in the title, "[object Promise]" in a meta tag, or hid and vmid attributes in the HTML.
---

# @unhead/vue

Tested with `@unhead/vue` 3.4.2, `unhead` 3.4.2, Vue 3.5, Vite 8, and TypeScript 6.0.3 (vue-tsc 3.3.12) and 7.0.2.
Import from `@unhead/vue` and its subpaths, which re-export `unhead`.
In Nuxt, Nuxt creates and installs the head. Skip Setup and use the composables.

## Setup

Create one head in the browser. On the server, create a new head for each request; a shared one leaks tags between requests.

```ts
// src/entry-client.ts
import { createHead } from '@unhead/vue/client'
import { createApp } from './main'

const { app } = createApp()
app.use(createHead())
app.mount('#app')
```

```ts
// src/entry-server.ts
import { createHead, transformHtmlTemplate } from '@unhead/vue/server'
import { renderToString } from 'vue/server-renderer'
import { createApp } from './main'

export async function render(template: string) {
  const { app } = createApp()
  const head = createHead()
  app.use(head)
  const html = await renderToString(app)
  return transformHtmlTemplate(head, template.replace('<!--app-html-->', html))
}
```

- If the template has no `<head>`, `transformHtmlTemplate` silently drops every tag.
- A client head on the server makes `transformHtmlTemplate` throw `Cannot read properties of undefined (reading 'htmlAttrs')`.
- The Options API `head()` option needs `app.mixin(VueHeadMixin)` in both entries. Without it, Vue ignores `head()`.

## Automatic behaviour

- The server head adds `<meta charset="utf-8">`, the viewport meta, and `<html lang="en">`. Override them with `useHead` or `disableDefaults: true`. The client head adds none.
- Tags dedupe on `title`, `name`, `property`, canonical `rel`, and `key`. The last entry wins. `htmlAttrs` and `bodyAttrs` merge.
- Matching tags in `index.html` are replaced, never duplicated. When the replacing entry goes away, they stay gone, except `<title>`, which reverts to the first document title. For site fallbacks, call `useHead(fallback, { tagPriority: 'low' })` in the root component.
- The client writes the DOM one macrotask after a change, so `document.title` is still old after `await nextTick()`. To read the result, use the `onRendered` entry option.
- On the server, refs and getters resolve at the first `transformHtmlTemplate` or `head.render()` call. The result is then cached.
- `Unhead()` from `@unhead/vue/vite` is optional. In dev it adds `ValidatePlugin`, which logs `[unhead]` warnings. In dev and build it rewrites static `useSeoMeta` input to `useHead`. Options `validate`, `transformSeoMeta`, and `treeshake` take `false`.

## Common tasks

### Reactive and async values

```vue
<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { onMounted, ref } from 'vue'

const product = ref<{ name: string, summary: string }>()
useHead({
  title: () => product.value?.name ?? 'Loading',
  meta: [{ name: 'description', content: () => product.value?.summary ?? 'Loading product details.' }],
})

onMounted(() => {
  fetch('/api/product').then(r => r.json()).then((data) => {
    product.value = data
  })
})
</script>
```

- Pass the ref or a getter.
- Call `useHead` synchronously in setup. After an `await` in a callback, or in an async `setup()` outside `<script setup>`, it throws `useHead() was called without provide context`. Update a ref instead, or call `patch()` on an entry made in setup. Top-level `await` in `<script setup>` keeps the context.

### Titles

```vue
<script setup lang="ts">
import { useHead } from '@unhead/vue'

useHead({ title: 'Pricing', titleTemplate: title => (title ? `${title} | Acme` : 'Acme') })
</script>
```

- A string template `'%s | Acme'` needs no plugin. If no entry sets a title, it renders ` | Acme`.
- `titleTemplate: computed(title => ...)` gets the previous computed value and renders `undefined | Acme`, with no type error.
- `titleTemplate: null` on a page removes an inherited template.
- `%separator`, `%siteName`, and other `templateParams` need `TemplateParamsPlugin`. Without it they print as text. Register it in the client entry and in each server `createHead`:

```ts
import { createHead } from '@unhead/vue/client'
import { TemplateParamsPlugin } from '@unhead/vue/plugins'

export const head = createHead({ plugins: [TemplateParamsPlugin] })
```

### SEO meta

```vue
<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue'

useSeoMeta({
  title: 'Pricing',
  description: 'Compare plans.',
  ogTitle: 'Pricing',
  ogImage: [{ url: 'https://example.com/og.png', width: 1200, height: 630, alt: 'Acme' }],
  robots: { noindex: true, nofollow: true },
})
</script>
```

- `robots: { index: false, follow: false }` renders no robots tag. Use `noindex` and `nofollow`, or a string.
- `content: null` removes an inherited meta tag.
- `useHead` does not sanitize. For values from users or APIs, use `useHeadSafe`. It keeps only JSON scripts. It drops `on*`, `http-equiv`, `javascript:` and `data:` URLs, and canonical, preload, prefetch, preconnect, and manifest links; set a canonical with `useHead`.

### Third-party scripts

```vue
<script setup lang="ts">
import { useScript } from '@unhead/vue'

interface Analytics { track: (event: string) => void }

const analytics = useScript<Analytics>('https://example.com/analytics.js', {
  use: () => (window as unknown as { analytics: Analytics }).analytics,
})
analytics.proxy.track('pageview')
analytics.onLoaded(api => api.track('loaded'))
</script>
```

- In a component, the script loads on mount with `defer` and `fetchpriority="low"`. An absolute URL also gets `crossorigin="anonymous"` and `referrerpolicy="no-referrer"`. SSR renders nothing for it unless you pass `trigger: 'server'`.
- If the script host sends no CORS headers, the browser blocks the load. Pass `useScript({ src, crossorigin: false })`.
- `trigger: 'manual'` waits for `load()`. A `Ref<boolean>` or getter trigger loads when it becomes true.
- Unmount does not remove the script. `proxy` exists only with `use` or `resolve`.

### Streaming SSR

On the server, `createStreamableHead()` from `@unhead/vue/stream/server` returns `{ head, wrapStream }`; return `wrapStream(renderToWebStream(app), template)`. On the client, use `createStreamableHead()` from `@unhead/vue/stream/client`, and add `Unhead({ streaming: true })` to the Vite config.

- Without the stream bootstrap, the client call returns `undefined`. Throw then; otherwise each `useHead` throws the provide-context error.
- A `useHead` call reaches the shell `<head>` only if no `await` ran before it, in its component or any ancestor. Later calls become inline patch scripts, which most bots ignore. Set canonical, robots, description, and Open Graph in the root or layout.
- `wrapStream` keeps the `<title>`, `<meta>`, and charset tags of the template, so the shell has two of each. Remove them from `index.html`.
- On the client, streamed patch tags stay after their component unmounts. Set title and description on every page.

## Traps

- v2 names are not converted: `hid`, `vmid`, `children`, and `body: true` render as literal attributes, such as `<meta hid="description">` or an empty `<script children="...">`. The table below has the new names.
- Promise values are not awaited. A promise title is dropped; a promise `content` renders `[object Promise]`. `PromisesPlugin` resolves them on the client, but on the server it drops every entry that holds a promise. Await the data first.
- `tagPriority: 'before:...'` and `'after:...'` need `AliasSortingPlugin`, or Unhead ignores them.
- `useServerHead`, `useServerHeadSafe`, and `useServerSeoMeta` are deprecated aliases that also run in the browser. With `Unhead()`, only a production client build removes them. For server-only tags, use `if (import.meta.env.SSR)`. The upgrade guide's `import.meta.server` exists only in Nuxt.
- Type errors name the wrong property. `Type '"description"' is not assignable to type 'ResolvableValue<undefined>'` means `content` is missing or a v2 key is present. A font preload without `crossorigin` fails on `rel` or `as`, not on `crossorigin`. Wrap a non-standard `rel` or script `type` in `defineLink()` or `defineScript()`.
- The install guide says `@unhead/vue@next`, which is 3.0.0-beta.9. Install `@unhead/vue`.

## Version limits

In 3.4.2, a `templateParams` value of `0` renders empty. A numeric `templateParams` value used in a JSON script with `processTemplateParams: true` throws in a hook: the HTML comes back unprocessed, then Node exits on an unhandled rejection that `try`/`catch` misses. Pass strings. unhead#1002 fixes both after 3.4.2.

## Upgrading from v1, v2, or @vueuse/head

| Old | 3.x |
| --- | --- |
| `createHead` from `@unhead/vue` or `@vueuse/head` | `createHead` from `@unhead/vue/client` or `@unhead/vue/server` |
| `createServerHead()` | `createHead()` from `@unhead/vue/server` |
| `Head` from `@vueuse/head` | `Head` from `@unhead/vue/components` |
| `hid`, `vmid` / `children` / `body: true` | `key` / `innerHTML` or `textContent` / `tagPosition: 'bodyClose'` |
| `await renderSSRHead(head)` | `head.render()`, synchronous |
| `useHead(input, { mode: 'server' })` | the server entry, or `import.meta.env.SSR` |
| `disableCapoSorting: true` | `tagWeight(tag)` on the server `createHead`; lower sorts first |
| `import unhead from '@unhead/vue/vite'` | `import { Unhead } from '@unhead/vue/vite'` |
| `script.then()`, `script.track()` | `script.onLoaded()`, `script.proxy.track()` |

## Debug

Without the Vite plugin, add `ValidatePlugin()` from `@unhead/vue/plugins` when `import.meta.env.DEV` is true; it also logs in production. It flags a missing `TemplateParamsPlugin` only if `templateParams` is set.
