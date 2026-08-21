#!/usr/bin/env node
/**
 * Byte evidence for RESEARCH.md: esbuild --bundle --minify each sizes/ entry,
 * vue packages external (they are free in a vue app), report min + gzip.
 * Run: node bench/v4-explore/vue-native/measure-bytes.mjs
 */
import { readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../../..')

function resolveEsbuild() {
  const req = createRequire(join(repoRoot, 'packages/unhead/package.json'))
  try {
    return req('esbuild')
  }
  catch {}
  const store = join(repoRoot, 'node_modules/.pnpm')
  const hits = readdirSync(store).filter(d => d.startsWith('esbuild@')).sort()
  if (!hits.length)
    throw new Error('esbuild not found; pnpm install first')
  return createRequire(import.meta.url)(join(store, hits.at(-1), 'node_modules/esbuild'))
}

const esbuild = resolveEsbuild()

async function size(entry) {
  const r = await esbuild.build({
    entryPoints: [join(here, 'sizes', entry)],
    bundle: true,
    minify: true,
    write: false,
    format: 'esm',
    logLevel: 'silent',
    metafile: true,
    external: ['vue', 'vue/server-renderer', '@vue/shared', '@vue/server-renderer'],
    define: { 'process.env.NODE_ENV': '"production"' },
  })
  const code = r.outputFiles[0].contents
  const inputs = Object.values(r.metafile.outputs)[0].inputs
  const l1 = Object.entries(inputs).reduce((bytes, [path, input]) =>
    bytes + (/(?:src\/v4\/compile\.ts|dist\/v4\/compile\.mjs|src\/v4\/(?:composables|resolver)\.ts)$/.test(path) ? input.bytesInOutput : 0), 0)
  if (entry.includes('compiled') && l1)
    throw new Error(`${entry} retained ${l1} bytes of loose compiler/resolver code`)
  return { min: code.length, gzip: gzipSync(code, { level: 9 }).length, l1 }
}

const entries = [
  ['server-baseline.ts', 'v4/server as-is (createHead + renderSSRHead)'],
  ['server-compiled.ts', 'v4/server-compiled (strict plan profile)'],
  ['server-vue-runtime.ts', '@unhead/vue/v4/server (vue external)'],
  ['server-vue-compiled.ts', '@unhead/vue/v4/server-compiled (vue external)'],
  ['server-route-plan.ts', 'v4 direct sealed route renderer'],
  ['server-seam.ts', 'seam server, default serializer (core consumer)'],
  ['server-vue.ts', 'seam server, vue serializer (vue consumer, vue external)'],
  ['client-baseline.ts', 'v4/client as-is (fx renderer)'],
  ['client-compiled.ts', 'v4/client-compiled (strict plan profile)'],
  ['client-vue-runtime.ts', '@unhead/vue/v4/client (vue external)'],
  ['client-vue-compiled.ts', '@unhead/vue/v4/client-compiled (vue external)'],
  ['client-vue.ts', 'vnode client (core + vue renderer glue, vue external)'],
  ['listy-v4.ts', 'normListy walker standalone'],
  ['listy-vue.ts', 'normListy on @vue/shared (externals) standalone'],
]

const rows = []
for (const [entry, label] of entries)
  rows.push({ entry, label, ...await size(entry) })

const pad = (s, n) => String(s).padEnd(n)
console.log(`${pad('entry', 22) + pad('min', 8) + pad('gzip', 8) + pad('L1', 6)}label`)
for (const r of rows)
  console.log(pad(r.entry, 22) + pad(r.min, 8) + pad(r.gzip, 8) + pad(r.l1, 6) + r.label)

const by = Object.fromEntries(rows.map(r => [r.entry, r]))
const d = (a, b) => `${by[a].min - by[b].min} min / ${by[a].gzip - by[b].gzip} gz`
console.log('\ndeltas:')
console.log(`  compiled core server saving:                              ${d('server-baseline.ts', 'server-compiled.ts')}`)
console.log(`  compiled vue server saving:                               ${d('server-vue-runtime.ts', 'server-vue-compiled.ts')}`)
console.log(`  compiled core client saving:                              ${d('client-baseline.ts', 'client-compiled.ts')}`)
console.log(`  compiled vue client saving:                               ${d('client-vue-runtime.ts', 'client-vue-compiled.ts')}`)
console.log(`  seam cost in core bundle (server-seam - server-baseline): ${d('server-seam.ts', 'server-baseline.ts')}`)
console.log(`  vue-consumer saving (server-baseline - server-vue):       ${d('server-baseline.ts', 'server-vue.ts')}`)
console.log(`  vnode-client saving (client-baseline - client-vue):       ${d('client-baseline.ts', 'client-vue.ts')}`)
console.log(`  listy saving (listy-v4 - listy-vue):                      ${d('listy-v4.ts', 'listy-vue.ts')}`)
