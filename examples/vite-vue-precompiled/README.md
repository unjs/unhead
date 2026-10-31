# vite-vue-precompiled

Vue 3 SSR app running unhead entirely in compiled mode.

- Every head call is static and finalized at build time into render plans.
- The neutral `@unhead/vue/precompiled` import is rewritten per build target:
  the server gets pre-rendered HTML plans, the client gets DOM-ready tuples.
- Dynamic input (`JSON.stringify()`, refs, functions, spreads) fails the build
  with a file/line/reason; use the normal `@unhead/vue` runtime for those
  pages instead.

```
pnpm install
pnpm build     # client + server
pnpm preview   # serve the production build on :5174
pnpm dev       # dev server (transforms active)
```

Verified behaviors:

- SSR HTML contains every compiled tag (title, metas, canonical, JSON-LD).
- The client adopts the SSR tags without duplicating them.
- Toggling `ProductCard` disposes and re-adds its compiled plan at runtime.
