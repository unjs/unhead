# nuxt-v4-trial

A minimal but real Nuxt 4 app running its entire head pipeline on the unhead v4 core through the `@unhead/vue/v4` adapter, wired up the same way a real site would do it: aliases only, no Nuxt fork, no patched node_modules.

This example's build is NOT run in CI. It exists as the de-risk for trying v4 on a real Nuxt site; the full recipe distilled from it lives in `packages/unhead/V4_TRIAL.md`.

## What it exercises

- `app.head` config in `nuxt.config.ts` (htmlAttrs, titleTemplate, meta), pushed by Nuxt on server and client
- `pages/index.vue`: `useHead` with a reactive computed title plus a button that mutates it client side
- `pages/about.vue`: `useSeoMeta` (title, description, ogTitle) plus a canonical link via `useHead`
- `NuxtLink` SPA navigation between the two pages
- Nuxt's own head machinery on top: the nitro renderer's `createHead`/`renderSSRHead`, `install-client-head`'s `dom:beforeRender` pause pattern and `head.render()`, and the `prefetch-preload-tags.server` plugin's `resolveTags` from `unhead/utils`

## How the override works

See `nuxt.config.ts`. Three pieces:

1. An alias map in `alias` (flows into both the vite builds and nitro's rollup build) mapping every `@unhead/vue` surface Nuxt imports onto the v4 adapter dist. Subpath keys come before the bare `@unhead/vue` key; `stream/*` and `scripts` stay on the current build.
2. A shim for `unhead/utils` (`shims/unhead-utils.mjs`) that keeps the real utils surface but swaps in the v4-shaped `resolveTags`.
3. A tiny inline module that re-emits Nuxt's `unhead-options.mjs` template, because the stock template imports `legacyPlugins` from an absolute resolved path into `dist/legacy.mjs` that no alias key can match.

`UNHEAD_V3_BASELINE=1 pnpm build` skips all of it for A/B comparison.

## Run it

```sh
pnpm build
node .output/server/index.mjs
```

## Evidence (2026-08-04, this branch)

`nuxt build` succeeds. `curl http://localhost:4173/`:

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Home · v4 trial</title>
<meta name="theme-color" content="#111111">
<meta name="description" content="Nuxt on unhead v4: home page">
```

`curl http://localhost:4173/about`:

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>About · v4 trial</title>
<meta name="theme-color" content="#111111">
<meta name="description" content="Nuxt on unhead v4: about page">
<meta property="og:title" content="About the v4 trial">
<link rel="canonical" href="https://example.com/about">
```

One `<title>` per page, one description per page, no duplicate tags, `<html lang="en">` from htmlAttrs, titleTemplate applied on the server. Diffing the SSR `<head>` against the `UNHEAD_V3_BASELINE=1` build (hashed asset links excluded) is byte-identical on both routes.

Headless Chromium run (Playwright via dev-browser):

- hydrate on `/`: `document.title` is `Home · v4 trial`, head child count stable, zero unhead DOM writes during hydration (the only head mutation is NuxtLink's own route-chunk `modulepreload`), zero console errors
- click `#bump`: title updates to `Home (1) · v4 trial` (reactive ref through `useHead`)
- SPA navigate to `/about`: title, description, `og:title` and canonical all swap in (2 added nodes, same count as the v3 baseline)
- navigate back: canonical and `og:title` removed, home head restored, element counts back to the hydrate state
