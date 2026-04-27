---
title: "ESLint Plugin"
description: "Catch unhead misuse, type-narrowing gaps, and v2-to-v3 migration problems at the source level. Pairs with the runtime ValidatePlugin and the unhead CLI."
navigation.title: "ESLint Plugin"
---

**Quick Answer:** `@unhead/eslint-plugin` lints calls into `useHead`, `useSeoMeta`, and friends for issues TypeScript can't catch. The recommended config wires up 13 rules and an autofix-driven migration mode.

## What Does This Plugin Do?

Type narrowing catches a lot of broken `useHead()` / `useSeoMeta()` calls, but not everything. The ESLint plugin walks tag literals at lint time and surfaces issues like:

- Deprecated v2 props (`children`, `hid`, `vmid`, `body: true`) with autofixes
- Empty meta content, HTML in titles, relative canonicals
- Conflicting robots directives, missing `crossorigin` on font preloads, missing `as` on preloads
- Typos in `name` / `property` (Levenshtein-suggested fixes)
- Numeric `tagPriority` (suggests the named `'critical'` / `'high'` / `'low'` form)
- Twitter handles missing `@`, accessibility-harmful viewport settings

These overlap with the runtime [Validate Plugin](/docs/head/guides/plugins/validate) and the `unhead` CLI by design: the same rule IDs flow through static lint, runtime warnings, and CLI reports.

## How Do I Set Up the Plugin?

Install:

::code-block

```bash [Terminal]
pnpm add -D @unhead/eslint-plugin
```

::

Wire up the recommended config in flat config:

::code-block

```ts [eslint.config.ts]
import { configs } from '@unhead/eslint-plugin'

export default [
  configs.recommended,
]
```

::

That's it. The config registers the `@unhead` plugin namespace and enables every recommended rule. No `files` glob is needed: the rules only fire on calls into the unhead API, so non-head code is silently ignored.

## How Do I Migrate from v2?

Swap `recommended` for `migration`:

::code-block

```ts [eslint.config.ts]
import { configs } from '@unhead/eslint-plugin'

export default [
  configs.migration,
]
```

::

`configs.migration` enables everything in `recommended` plus `prefer-define-helpers`, which wraps `link` / `script` tag object literals in `defineLink` / `defineScript` via autofix. Combined with `no-deprecated-props` (also autofixable), `eslint --fix` handles the bulk of a v2-to-v3 migration mechanically.

> Don't want to wire ESLint? `@unhead/cli` ships the same rules as a standalone command (`unhead audit` / `unhead migrate`) running on a native oxc parser, no parser configuration, works out-of-the-box on `.ts` / `.tsx` / `.vue` / `.svelte`.

## What Rules Are Included?

| Rule | Default | Autofix | What it catches |
|---|---|---|---|
| `defer-on-module-script` | `warn` | ✓ | `<script type="module" defer>` (defer is redundant) |
| `empty-meta-content` | `warn` |   | `<meta name="description" content="">` |
| `no-deprecated-props` | `error` | ✓ | v2 props: `children`, `hid`, `vmid`, `body: true` |
| `no-html-in-title` | `warn` |   | HTML chars in `title` (will be escaped, not rendered) |
| `no-unknown-meta` | `warn` | ✓ | typos in `name` / `property` (Levenshtein-suggested fix) |
| `non-absolute-canonical` | `warn` |   | relative URLs in `<link rel="canonical">` |
| `numeric-tag-priority` | `warn` | suggestion | numeric `tagPriority` (suggests `'critical'`, `'high'`, or `'low'`) |
| `prefer-define-helpers` | off (migration only) | ✓ | wraps `link` / `script` literals in `defineLink` / `defineScript` |
| `preload-font-crossorigin` | `error` | ✓ | font preloads missing `crossorigin` (would refetch) |
| `preload-missing-as` | `error` |   | `<link rel="preload">` missing required `as` |
| `robots-conflict` | `error` |   | `index, noindex` or `follow, nofollow` in robots meta |
| `script-src-with-content` | `error` |   | a script with both `src` and inline content |
| `twitter-handle-missing-at` | `warn` | ✓ | `twitter:site` / `twitter:creator` missing `@` |
| `viewport-user-scalable` | `warn` |   | `user-scalable=no` or `maximum-scale=1` (accessibility) |

## What Calls Does It Walk?

Rules apply to source-level calls into the unhead API:

- `useHead`, `useHeadSafe`, `useServerHead`, `useServerHeadSafe`
- `useSeoMeta`, `useServerSeoMeta`
- The tag helpers `defineLink` and `defineScript`

Tag arrays inside `meta` / `link` / `script` / `noscript` / `style` keys are descended automatically, so a typo inside a `link[3]` literal still gets caught.

## What Can't It Catch?

ESLint rules can only see what's expressible in the AST. Cross-tag and rendered-output checks live in the runtime [Validate Plugin](/docs/head/guides/plugins/validate) and are surfaced by the `unhead validate-url` / `unhead validate-html` CLI commands. Examples that need rendered output:

- `canonical-og-url-mismatch`: needs both tags resolved together
- `meta-beyond-1mb`: depends on rendered byte position
- `charset-not-early`: depends on tag ordering after deduplication
- `too-many-preloads`: depends on the merged tag set across all entries

The plugin imports its rule IDs and known-meta sets from `unhead/validate`, the same module the runtime plugin reads, so lint diagnostics, runtime warnings, and CLI reports stay aligned by construction.

## Related

- [Validate Plugin](/docs/head/guides/plugins/validate) - Runtime equivalent that catches cross-tag and rendered-output issues
- [useHead()](/docs/head/api/composables/use-head) - Type-safe head tag management
- [useSeoMeta()](/docs/head/api/composables/use-seo-meta) - Type-safe SEO meta management
