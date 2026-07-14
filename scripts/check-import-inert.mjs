/**
 * Asserts every runtime entry is import-inert: bundling a bare
 * `import 'pkg/entry'` with tree-shaking must produce an EMPTY bundle.
 *
 * A non-empty bundle means rolldown found module-evaluation side effects
 * (top-level calls, globalThis writes, env detection) that it must retain
 * even when nothing is imported — the exact class of code banned by the
 * side-effects policy in CONTRIBUTING.md. Inert declarations (const
 * literals, lazy `let` memos, function/class declarations) shake to zero.
 *
 * Bundles from src (no build step). Bare specifiers are external: each
 * package's inertness is asserted independently, and a retained external
 * side-effect import (`import "vue"`) is itself a failure.
 *
 * svelte/solid-js/angular are excluded — their entries need framework
 * compilers to bundle; their runtime logic lives in unhead which is covered.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { rolldown } from 'rolldown'

const ROOT = resolve(import.meta.dirname, '..')

const PACKAGES = ['unhead', 'vue', 'react', 'schema-org']

const EXCLUDE = new Set([
  // the streaming IIFE runs on load by design (injected into HTML)
  'unhead:./stream/iife',
])

function srcEntryFor(pkgDir, exportKey) {
  const name = exportKey === '.' ? 'index' : exportKey.slice(2)
  for (const candidate of [`src/${name}.ts`, `src/${name}/index.ts`]) {
    const abs = resolve(pkgDir, candidate)
    if (existsSync(abs))
      return abs
  }
  return null
}

function collectEntries() {
  const entries = []
  for (const pkg of PACKAGES) {
    const pkgDir = resolve(ROOT, 'packages', pkg)
    const pkgJson = JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf-8'))
    for (const key of Object.keys(pkgJson.exports || {})) {
      if (key === './package.json' || EXCLUDE.has(`${pkg}:${key}`))
        continue
      const src = srcEntryFor(pkgDir, key)
      if (!src)
        throw new Error(`[import-inert] cannot map ${pkgJson.name}${key.slice(1)} to a src entry`)
      entries.push({ id: `${pkgJson.name}${key === '.' ? '' : key.slice(1)}`, src })
    }
  }
  return entries
}

async function bundleBareImport(entry) {
  const bundle = await rolldown({
    input: 'virtual:entry',
    external: id => !id.startsWith('.') && !id.startsWith('/') && id !== 'virtual:entry',
    logLevel: 'silent',
    // 'no-external': analyze internal modules for real side effects instead of
    // trusting the package.json `sideEffects: false` claim (which would make
    // this check vacuous — the field drops modules regardless of content),
    // while unused external imports are still shaken away
    treeshake: { moduleSideEffects: 'no-external' },
    plugins: [{
      name: 'virtual-entry',
      resolveId: id => id === 'virtual:entry' ? id : null,
      load: id => id === 'virtual:entry' ? `import '${entry.src}'` : null,
    }],
  })
  const { output } = await bundle.generate({ format: 'esm' })
  await bundle.close()
  // rolldown emits bare //#region markers even for empty chunks — not code
  return output.filter(o => o.type === 'chunk').map(o => o.code).join('\n').split('\n').filter(l => l.trim() && !l.trim().startsWith('//#')).join('\n').trim()
}

const entries = collectEntries()
const failures = []
for (const entry of entries) {
  const residue = await bundleBareImport(entry)
  if (residue) {
    failures.push({ entry, residue })
    console.error(`✖ ${entry.id} is NOT import-inert (${residue.length} bytes retained):`)
    console.error(residue.split('\n').slice(0, 20).map(l => `    ${l}`).join('\n'))
  }
  else {
    console.log(`✔ ${entry.id}`)
  }
}

if (failures.length) {
  console.error(`\n${failures.length}/${entries.length} entries retained module-evaluation side effects.`)
  console.error('See CONTRIBUTING.md — modules must be import-inert.')
  process.exit(1)
}
console.log(`\nAll ${entries.length} entries are import-inert.`)
