# `@unhead/eslint-plugin`

ESLint rules that catch unhead misuse, type-narrowing issues, and v2-to-v3 migration problems at the source level. Pairs with the runtime `ValidatePlugin` and the `unhead` CLI to give you static and runtime coverage of the same rule set.

## Install

```bash
pnpm add -D @unhead/eslint-plugin eslint
```

## Usage (flat config)

```ts
// eslint.config.ts
import unhead from '@unhead/eslint-plugin'

export default [
  unhead.configs.recommended,
]
```

For projects migrating from unhead v2, swap in `unhead.configs.migration` to also wrap tag literals in the `defineLink` / `defineScript` helpers.

## Rules

| Rule | Default | Autofix | What it catches |
|---|---|---|---|
| `defer-on-module-script` | warn | ✓ | `<script type="module" defer>` (defer is redundant) |
| `empty-meta-content` | warn |   | `<meta name="description" content="">` |
| `no-deprecated-props` | error | ✓ | v2 props: `children`, `hid`, `vmid`, `body: true` |
| `no-html-in-title` | warn |   | HTML chars in `title` (will be escaped, not rendered) |
| `no-unknown-meta` | warn | ✓ | typos in `name` / `property` (Levenshtein-suggested fix) |
| `non-absolute-canonical` | warn |   | relative URLs in `<link rel="canonical">` |
| `numeric-tag-priority` | warn | suggestion | numeric `tagPriority` (suggests `'critical'`, `'high'`, or `'low'`) |
| `prefer-define-helpers` | off (migration only) | ✓ | wraps `link` / `script` tag object literals in `defineLink` / `defineScript` |
| `preload-font-crossorigin` | error | ✓ | font preloads missing `crossorigin` (would refetch) |
| `preload-missing-as` | error |   | `<link rel="preload">` missing required `as` |
| `robots-conflict` | error |   | `index, noindex` or `follow, nofollow` in robots meta |
| `script-src-with-content` | error |   | a script with both `src` and inline content |
| `twitter-handle-missing-at` | warn | ✓ | `twitter:site` / `twitter:creator` missing `@` |
| `viewport-user-scalable` | warn |   | `user-scalable=no` or `maximum-scale=1` (accessibility) |

## Coverage

These rules walk source-level calls into the unhead API: `useHead`, `useHeadSafe`, `useServerHead`, `useServerHeadSafe`, `useSeoMeta`, `useServerSeoMeta`, and the tag helpers `defineLink` / `defineScript`. Tag arrays inside `meta` / `link` / `script` / `noscript` / `style` keys are descended automatically.

Rules can only see what's expressible in the AST. Cross-tag and rendered-output checks (e.g. `canonical-og-url-mismatch`, `meta-beyond-1mb`, `charset-not-early`, `too-many-preloads`) live in the runtime `ValidatePlugin` and are surfaced by the `unhead validate-url` / `unhead validate-html` CLI commands.

## Rule constants

The plugin imports its rule IDs and known-meta sets from `unhead/validate`, the same module the runtime `ValidatePlugin` reads. This keeps lint diagnostics, runtime warnings, and CLI reports aligned by construction.
