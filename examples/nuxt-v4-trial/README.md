# nuxt-v4-trial

Nuxt 4 trial app wired to the workspace unhead packages, running compiled
mode alongside Nuxt's normal head runtime.

- `pnpm-workspace.yaml` overrides (`nuxt>@unhead/vue`, `nuxt>unhead`) force
  Nuxt to load the workspace packages instead of its published copies.
- The unhead vite plugin runs with `experimental: { precompile: true }`.

## How compiled mode bridges into Nuxt

Nuxt creates and owns its head instance from the normal `@unhead/vue`
runtime, so sealed plans cannot attach to it. The local `sealed-head` module
(`modules/sealed-head.ts`) runs a SECOND, sealed head alongside Nuxt's:

1. a universal plugin creates the sealed head per environment (the neutral
   `@unhead/vue/precompiled` import is rewritten per build target) and
   provides it as `nuxtApp.$sealedHead`
2. pages pass it explicitly: `useSeoMeta({ ... }, { head })` — the bundler
   compiles the call and threads the binding through the framework adapter
3. on the server, `server/plugins/sealed-head.ts` merges the sealed payload
   into the response through nitro's `render:html` hook (per-request, keyed
   by the h3 event via a WeakMap)
4. on the client, the eager sealed head renders on push, adopts the
   SSR-rendered tags by identity, and disposes/re-adds plans on navigation

Verified: SSR HTML contains the compiled tags, the browser adopts them
without duplication, SPA navigation disposes and restores them, and the
`/dynamic` page keeps full normal-runtime behavior (reactive title).

Full compiled mode in Nuxt would productize this bridge inside a future
`@unhead/nuxt` integration.

## Earlier notes

- An earlier NUXT_B7021 (client manifest) failure during these trials was
  collateral: it only appeared when the SSR build itself failed, because
  vite then ran `closeBundle` twice and the second pass read a manifest the
  first pass had deleted. Fixed by the sealed-runtime transform skip in
  `@unhead/bundler`; no nuxt-side workaround is needed.
