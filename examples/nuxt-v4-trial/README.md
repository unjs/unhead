# nuxt-v4-trial

Nuxt 4 trial app wired to the workspace unhead packages.

- `pnpm-workspace.yaml` overrides (`nuxt>@unhead/vue`, `nuxt>unhead`) force
  Nuxt to load the workspace packages instead of its published copies.
- The unhead vite plugin runs with `experimental: { precompile: true }`.

## Compiled mode status in Nuxt

The flag is currently **inert** for ordinary Nuxt apps: Nuxt creates and owns
its head instance from the normal `@unhead/vue` runtime, so sealed plans from
`@unhead/vue/precompiled` have no sealed head to attach to. Full compiled-mode
support needs Nuxt-side integration (a sealed head instance plus sealed SSR
rendering). Until then this example verifies:

1. the workspace plugin builds Nuxt successfully with the flag enabled,
2. ordinary imports and dynamic tags (`/dynamic`) behave unchanged,
3. the workspace overrides resolve correctly for Nuxt's dependency tree.

See `examples/vite-vue-precompiled` for a fully compiled app.
