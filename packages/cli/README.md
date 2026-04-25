# `@unhead/cli`

Command-line tools to audit and migrate unhead head usage in your codebase. Wraps `@unhead/eslint-plugin` for source-level checks and the runtime `ValidatePlugin` for rendered-HTML checks.

## Install

```bash
pnpm add -D @unhead/cli
```

The binary is installed as `unhead`.

## Commands

### `unhead audit [globs...]`

Lint your source for unhead misuse using the recommended ESLint rule set.

```bash
unhead audit                   # default: **/*.{js,ts,vue,svelte,...}
unhead audit src/**/*.ts
```

Exits with code 1 when any rule fires at `error` severity.

### `unhead migrate [globs...]`

Apply autofixes for v2-to-v3 migration: rewrites deprecated props (`children` → `innerHTML`, `hid`/`vmid` → `key`, `body: true` → `tagPosition: 'bodyClose'`), prepends missing `@` on Twitter handles, removes redundant `defer` on module scripts, adds `crossorigin` to font preloads, and wraps tag object literals in their `defineX` helper for type narrowing.

```bash
unhead migrate
unhead migrate --dry-run       # report fixable count without writing
```

### `unhead validate-html [globs...]`

Run the runtime `ValidatePlugin` over prerendered HTML files. Catches the cross-tag and rendered-output rules that lint can't see.

```bash
unhead validate-html '.output/public/**/*.html'
unhead validate-html dist/index.html --json
```

Exits with code 1 when any rule fires at `warn` severity. Runtime `ValidatePlugin` rules don't have an `error` tier (`audit` does), so this is the strictest CI gate; downgrade specific rules to `info` or `off` via the plugin options if you want them non-blocking.

### `unhead validate-url <url>`

Fetch a live URL and run the runtime `ValidatePlugin` over its `<head>`.

```bash
unhead validate-url https://example.com
unhead validate-url https://example.com --json
unhead validate-url https://example.com --user-agent 'Twitterbot/1.0'
unhead validate-url https://example.com --timeout 10000
```

The default user agent is `facebookexternalhit/1.1` so social-crawler-aware rules (e.g. `meta-beyond-1mb`) engage on the response. The fetch is aborted after `--timeout` milliseconds (default 30000) and non-HTML responses fail fast.

Exits with code 1 when any rule fires at `warn` severity (runtime rules don't expose an `error` tier).

## What runs where

unhead validation lives in three layers; each catches a different class of issue. The CLI gives you one entry point to all three.

| Rule class | Source-level lint (`audit` / `migrate`) | HTML lint (`validate-html` / `validate-url`) | Runtime `ValidatePlugin` in your app |
|---|---|---|---|
| Typos in meta `name` / `property` | ✓ | ✓ | ✓ |
| Deprecated v2 props (`children`, `hid`, `body`) | ✓ | — | ✓ |
| Numeric `tagPriority` | ✓ | ✓ | ✓ |
| `<script type="module" defer>` | ✓ | ✓ | ✓ |
| Preload missing `as` / font `crossorigin` | ✓ | ✓ | ✓ |
| Twitter handle missing `@` | ✓ | ✓ | ✓ |
| Robots `index/noindex` conflict | ✓ | ✓ | ✓ |
| Non-absolute canonical / OG URLs | ✓ | ✓ | ✓ |
| Empty meta content / HTML-in-title | ✓ | ✓ | ✓ |
| Viewport blocks user zoom | ✓ | ✓ | ✓ |
| Canonical vs `og:url` mismatch | — | ✓ | ✓ |
| `og:image` missing dimensions | — | ✓ | ✓ |
| Missing description / title | — | ✓ | ✓ |
| Missing OG title / description | — | ✓ | ✓ |
| Charset not within first N tags (SSR) | — | ✓ | ✓ |
| Meta tag past 1MB crawler limit | — | ✓ | ✓ |
| Too many preloads / preconnects / `fetchpriority="high"` | — | ✓ | ✓ |
| Duplicate / redundant resource hints | — | ✓ | ✓ |
| Preload + async/defer / preload + prefetch conflicts | — | ✓ | ✓ |
| Inline script / style size budget | — | ✓ | ✓ |
| Missing `TemplateParamsPlugin` / `AliasSortingPlugin` | — | — | ✓ (plugin presence is runtime-only) |

Source-level lint is the cheapest feedback loop and runs in your editor. The HTML pass catches everything that depends on the resolved tag list. The runtime plugin gives you live warnings during dev. Use them together.

## Rule references

Rule IDs are shared across all three layers. See [`@unhead/eslint-plugin`'s rules table](../eslint-plugin/README.md#rules) for source-level rules; runtime-only rule IDs are documented in `unhead/plugins`'s `ValidatePlugin` JSDoc.
