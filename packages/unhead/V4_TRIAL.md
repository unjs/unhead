# Running a real Nuxt site on the v4 core

Recipe distilled from `examples/nuxt-v4-trial`, which is a working Nuxt 4.5 app on the v4 head pipeline (build passes, SSR head byte-identical to v3, hydration and SPA navigation verified in a real browser). Everything below is what actually worked there, not theory.

The v4 runtime ships as `/v4` subpaths of the regular packages (`unhead/v4/*`, `@unhead/vue/v4/*`), so "running on v4" means two steps: get this branch's build of `unhead` + `@unhead/vue` into your site, then alias the surfaces Nuxt imports onto the v4 subpaths.

## 1. Point your site at this branch's build

Check out the branch and build once:

```sh
git clone -b v4/core-experiment https://github.com/unjs/unhead
cd unhead && pnpm install
pnpm --filter unhead build && pnpm --filter @unhead/vue build
```

Then in your site's `package.json`, either file: overrides to the checkout:

```json
{
  "pnpm": {
    "overrides": {
      "unhead": "file:../unhead/packages/unhead",
      "@unhead/vue": "file:../unhead/packages/vue"
    }
  }
}
```

or pack tarballs (`pnpm --filter unhead pack && pnpm --filter @unhead/vue pack`) and point the overrides at the `.tgz` files. Add both packages as direct devDependencies too so `node_modules/@unhead/vue` exists for the alias paths below. Run `pnpm install`.

Note: nuxt 4.5.x already depends on this repo's 3.x line (it imports `@unhead/vue/stream/*`), so the override is a same-major swap plus the extra `/v4` entries. If your lockfile resolves an older unhead, fix that first.

## 2. The alias set (nuxt.config.ts)

`nuxt.options.alias` flows into both the vite builds (client + server app bundle) and nitro's rollup build (the renderer that calls `createHead`/`renderSSRHead`), so one map covers every consumer. Order matters: rollup-style aliases match a key exactly or as a prefix followed by `/`, so every subpath needs its own entry BEFORE the bare `@unhead/vue` key. `stream/*` and `scripts` stay on the v3 build (the nitro renderer imports `stream/server` at module top level even with streaming disabled, and v4 has no streaming surface).

```ts
import { fileURLToPath } from 'node:url'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const u = (p: string) => r(`./node_modules/@unhead/vue/dist/${p}`)

const unheadV4Alias = {
  '@unhead/vue/stream/server': u('stream/server.mjs'),
  '@unhead/vue/stream/client': u('stream/client.mjs'),
  '@unhead/vue/stream/iife': u('stream/iife.mjs'),
  '@unhead/vue/scripts': u('scripts.mjs'),
  '@unhead/vue/types': u('types.mjs'),
  '@unhead/vue/legacy': u('legacy.mjs'),
  '@unhead/vue/client': u('v4/client.mjs'),
  '@unhead/vue/server': u('v4/server.mjs'),
  '@unhead/vue/plugins': u('v4/plugins.mjs'),
  '@unhead/vue/utils': u('v4/utils.mjs'),
  '@unhead/vue': u('v4.mjs'),
  'unhead/utils': r('./shims/unhead-utils.mjs'),
}

export default defineNuxtConfig({
  alias: unheadV4Alias,
  // ...
})
```

## 3. The unhead/utils shim

Nuxt's `prefetch-preload-tags.server` plugin imports `resolveTags` from `unhead/utils` and calls it with the (now v4) `ssrContext.head`. The adapter ships a v3-shaped `resolveTags` for exactly that call. The shim keeps the rest of the real utils surface because the v4 adapter itself imports `walkResolver` from `unhead/utils`, and the alias routes that here too. Both imports must be file paths; a bare `unhead/utils` import inside the shim would hit the alias again and cycle.

`shims/unhead-utils.mjs`:

```js
export * from './node_modules/unhead/dist/utils.mjs'
export { resolveTags } from './node_modules/@unhead/vue/dist/v4/utils.mjs'
```

(Adjust the relative paths to wherever the shim file lives.)

## 4. Override Nuxt's unhead-options template

Nuxt's `unhead-options.mjs` template imports `legacyPlugins` from an ABSOLUTE resolved path into `@unhead/vue/dist/legacy.mjs` (with `future.compatibilityVersion` 4, the default), which no alias key can reliably match. Re-emit the template after all modules ran; the bare specifier import then goes through the alias to the v4 plugins entry:

```ts
import { addTemplate, defineNuxtModule } from 'nuxt/kit'

const UnheadV4Options = defineNuxtModule({
  meta: { name: 'unhead-v4-options' },
  setup(_, nuxt) {
    nuxt.hooks.hook('modules:done', () => {
      addTemplate({
        filename: 'unhead-options.mjs',
        getContents: () => [
          'import { TemplateParamsPlugin } from \'@unhead/vue/plugins\'',
          'export default {',
          '  disableDefaults: true,',
          '  plugins: [TemplateParamsPlugin],',
          '}',
        ].join('\n'),
      })
    })
  },
})

export default defineNuxtConfig({
  modules: [UnheadV4Options],
  // ...
})
```

## Known broken

- `experimental.ssrStreaming`: do not enable it. `stream/*` stays on v3 and the v3 streaming renderer cannot drive a v4 head.
- `@nuxt/scripts` and `useScript`: the v3 scripts entry runs against the v4 head and depends on the v3 hook bus, which the adapter only shims for `dom:beforeRender`. Any other `head.hooks.hook(...)` call warns in dev and no-ops; v3-style plugins passed to `head.use` are not supported either.
- `templateParams` as a `useHead` input key: replaced by `useTemplateParams` from `@unhead/vue/plugins` (v4 slot plugin). Sites pushing `{ templateParams: {...} }` need that migration.
- v3 `legacyPlugins` extras (`DeprecationsPlugin`, `PromisesPlugin`, `AliasSortingPlugin`) are not registered: promise values in head input no longer resolve, v1/v2 deprecated prop shapes are not rewritten, and `tagPriority: 'before:...'` alias sorting is gone (capo weights are built into the v4 compiler).
- Island / server component head payloads: unexercised by the trial; the adapter's `freezeHead` interop works (Nuxt only wraps `head.push`) but island head extraction has not been proven.
- Anything else reading v3 internals off the head instance (`head.entries`, `head.headEntries()`, full `head.hooks`): not there on v4.

## Rollback

Delete the `pnpm.overrides` block (and the devDependencies if you added them), remove the `alias` map, the shim file, and the `UnheadV4Options` module from `nuxt.config.ts`, then `pnpm install`. Nothing else in the site changes.

## What you should see

Measured on `examples/nuxt-v4-trial` (v4 vs `UNHEAD_V3_BASELINE=1` build of the same app):

- Identical SSR head output: diffing the SSR `<head>` of both routes (hashed asset links excluded) is byte-identical, including htmlAttrs and titleTemplate handling.
- No extra DOM work at hydrate: zero unhead head mutations during hydration on both builds (v4 adopts SSR elements lazily; the only observed head mutation was NuxtLink's own route-chunk `modulepreload`). SPA navigation produced the same 2 head mutations on both.
- Bundle: total client JS 189.1 kB raw for v4 vs 190.9 kB for v3 in the trial app. Summed gzip looked slightly larger on v4 (73.1 vs 70.7 kB) only because the aliased dist files made vite emit 8 chunks instead of 5; per-byte the v4 head runtime is smaller, and the gap should widen once the app is bundled from `@unhead/vue/v4` source instead of prebuilt dist files.
