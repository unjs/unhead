# Contributing to Unhead

Thanks for taking the time to contribute. Issues and pull requests are welcome.

## Setup

Unhead is a pnpm monorepo. You'll need Node 20+ and [pnpm](https://pnpm.io) (the version is pinned via `packageManager`, so `corepack enable` is enough).

```bash
git clone https://github.com/unjs/unhead.git
cd unhead
pnpm install
pnpm build
```

`pnpm stub` links packages in dev mode so cross-package changes are picked up without rebuilding.

## Project structure

- `packages/unhead` is the core: SSR/DOM rendering, tag normalization, dedupe, plugins.
- `packages/{vue,react,svelte,solid-js,angular}` are the framework bindings.
- `packages/schema-org` provides Schema.org graph support across frameworks.
- `packages/bundler`, `packages/addons` hold build-time tooling (unplugin/vite).
- `bench/` contains vitest benchmarks and the CI perf/bundle-size harnesses.
- `docs/` is the documentation site content.

## Development

```bash
pnpm test               # lint + vue-tsc + full vitest suite
pnpm lint               # eslint with autofix
vitest packages/unhead  # focused test runs
pnpm test:import-inert  # side-effects check (see policy below)
pnpm bundle-size:sync   # rebuild bundle-size baselines
```

For bug fixes, write the failing test first. Tests live in each package's `test/` directory; unit tests should not require a build, they run against `src`.

## Pull requests

- Target `main`.
- Use conventional commit titles (`fix(vue): ...`, `feat: ...`, `chore: ...`). Scope by package where it makes sense.
- Keep PRs focused; unrelated refactors make review slower.
- CI runs lint, typecheck, tests, export snapshots, bundle-size analysis, and the import-inert check. All must be green.
- Public API changes need a strong justification; export snapshots will flag them.

## Side effects & module state policy

Unhead runs in environments where module scope outlives the request: Cloudflare Workers isolates, warm AWS Lambda containers, long-lived Node/Bun/Deno servers. Module state is a process-global cache with unbounded lifetime. These rules are binding for all runtime packages and enforced in PR review.

### 1. Modules must be import-inert

Importing any runtime module must execute nothing observable.

- No top-level function calls.
- No `globalThis`/`window` reads or writes at module scope.
- No environment detection at module scope (defer to call time).
- All packages declare `"sideEffects": false`; keep that declaration accurate.
- Annotate factory functions with `/* @__NO_SIDE_EFFECTS__ */`.

Top-level `const` literals and lazy `let` declarations are fine; bundlers do not treat inert declarations as side effects.

### 2. Module-scope mutable state: pure memoization only

Module-level mutable state is allowed only as a lazy memo of pure, request-independent computation. All three conditions must hold:

1. **Constant-derived.** Input comes solely from module constants. Never from `createHead` options, head entries, hooks, request data, or user input. Review test: does anything flowing into this variable originate outside a module constant? If yes, it belongs on the head instance.
2. **Immutable after creation.** Nothing downstream may mutate the cached value. Guard every path that could hand it to user code (hooks, resolvers); fall back to the uncached path instead of exposing the shared value.
3. **Behavior-identical.** Output must be byte-identical with the cache disabled, and tested as such.

Reference implementation: the precomputed default-init tags in `packages/unhead/src/server/createHead.ts` (`defaultInitTags`, PR #828). It memoizes a frozen literal, never assigns the shared array to `_tags`, and any hook or non-`_static` resolver forces the normalize path.

Rationale: state derived only from constants is the same value for every request by construction, so caching it cannot leak context or grow memory. State derived from anything per-call is where every real cross-request leak lives, and is banned at module scope entirely.

### 3. No ambient head instance

The head instance is always explicit: created per request on the server, passed through framework context (Vue provide/inject, React context, etc.) on the client.

- No `activeHead`-style singleton. v1 had one; it leaked heads between concurrent SSR requests and was removed in v2. Do not reintroduce it.
- No unctx-style `globalThis` registries. The non-ALS mode is the v1 bug with a dependency; the AsyncLocalStorage mode adds `nodejs_compat` coupling and per-call overhead to buy back implicitness the API deliberately gave up. Unhead can always thread the instance, so ambient context is pure liability here.

### 4. Client singletons

A lazily created client-only singleton (e.g. the react Helmet fallback head) is acceptable only when it throws on the server (`typeof window === 'undefined'`) and exists purely as a browser convenience where no provider is present.

### Enforcement

Rule 1 is enforced in CI: `pnpm test:import-inert` (`scripts/check-import-inert.mjs`) bundles a bare `import 'pkg/entry'` of every runtime entry from source with tree-shaking analysis forced on (the `sideEffects: false` claim is deliberately not trusted) and fails if the bundle is non-empty. Top-level factory calls that are pure but not provably so to a bundler must be annotated: `/* @__PURE__ */` at the call site (e.g. `createContext`, `createUnplugin`, `createFrameworkPlugin`) or `/* @__NO_SIDE_EFFECTS__ */` on the function declaration when every call is pure (e.g. `defineSchemaOrgResolver`, `createHead`).
