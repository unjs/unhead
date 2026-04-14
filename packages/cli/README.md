# @unhead/cli

Codemods and tooling for migrating [Unhead](https://unhead.unjs.io) projects between major versions.

## Usage

```bash
npx @unhead/cli migrate [paths...]
```

### Flags

- `--dry` print the diff without writing.
- `--check` exit with code 1 if any changes are still needed; implies `--dry`.
- `--json` machine-readable report on stdout.
- `--rules <ids>` comma-separated rule IDs to include. Prefix with `!` to exclude, e.g. `--rules !prop-hid,prop-vmid`.
- `--framework <vue|react|svelte|solid|angular>` framework hint.

### Rules (batch 1)

| ID | What it does |
|----|--------------|
| `prop-hid` | `{ hid }` → `{ key }` on head tags. |
| `prop-vmid` | `{ vmid }` → `{ key }`. |
| `prop-children` | `children` → `innerHTML`. |
| `prop-body-true` | `body: true` → `tagPosition: 'bodyClose'`; drops `body: false`. |
| `prop-render-priority` | `renderPriority` → `tagPriority`. |
| `meta-content-undefined` | `content: undefined` → `content: null`. |

More rules land incrementally; see `docs/plans/cli-migrate.md`.

## Programmatic use

```ts
import { migrate } from '@unhead/cli'

const report = await migrate({ paths: ['src'], dry: true })
console.log(report.entries)
```
