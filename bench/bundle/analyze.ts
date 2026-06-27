import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function formatSize(size: number): string {
  return `${Math.round(size / 102.4) / 10} kB`
}

interface BundleData {
  name: string
  size: number
  gzippedSize: number
  baseSize: number
  baseGzippedSize: number
}

type Status = 'new' | 'grew' | 'shrank' | 'same'

// gzipped deltas below this are minifier jitter, not a real change
const GZ_NOISE_BYTES = 16

function categoryOf(name: string): string {
  if (name.startsWith('Vue'))
    return 'Vue'
  if (name.startsWith('Schema.org'))
    return 'Schema.org'
  return 'Core'
}

function statusOf(item: BundleData): Status {
  // a missing baseline (base ref predates the bundle) is a brand-new bundle, not a regression
  if (item.baseSize === 0 && item.baseGzippedSize === 0)
    return 'new'
  const gzDiff = item.gzippedSize - item.baseGzippedSize
  if (Math.abs(gzDiff) < GZ_NOISE_BYTES)
    return 'same'
  return gzDiff > 0 ? 'grew' : 'shrank'
}

function pct(diff: number, base: number): string {
  if (base <= 0)
    return ''
  const v = (diff / base) * 100
  return ` (${v > 0 ? '+' : '-'}${Math.abs(v).toFixed(1)}%)`
}

// kB rounds sub-100-byte changes to "0 kB"; show those in bytes so a small but real delta still reads
function formatDelta(bytes: number): string {
  const abs = Math.abs(bytes)
  const sign = bytes > 0 ? '+' : '-'
  return abs < 100 ? `${sign}${abs} B` : `${sign}${formatSize(abs)}`
}

function deltaCell(item: BundleData, status: Status): string {
  if (status === 'new')
    return '🆕 new'
  if (status === 'same')
    return '—'
  const gzDiff = item.gzippedSize - item.baseGzippedSize
  const emoji = gzDiff > 0 ? '🔴' : '🟢'
  return `${emoji} ${formatDelta(gzDiff)}${pct(gzDiff, item.baseGzippedSize)}`
}

function render(data: BundleData[]): string {
  const rows = data.map(item => ({ item, status: statusOf(item) }))
  const changed = rows.filter(r => r.status === 'grew' || r.status === 'shrank')
  const grew = changed.filter(r => r.status === 'grew')
  const newly = rows.filter(r => r.status === 'new')
  const netGz = changed.reduce((sum, r) => sum + (r.item.gzippedSize - r.item.baseGzippedSize), 0)

  const verdict: string[] = []
  if (grew.length)
    verdict.push(`⚠️ **${grew.length} bundle${grew.length > 1 ? 's' : ''} grew** · net ${formatDelta(netGz)} gz`)
  else if (changed.length)
    verdict.push(`🟢 **${changed.length} smaller** · net ${formatDelta(netGz)} gz`)
  else
    verdict.push('✅ **No notable changes**')
  if (newly.length)
    verdict.push(`🆕 ${newly.length} new bundle${newly.length > 1 ? 's' : ''} tracked`)

  const out: string[] = ['### 📦 Bundle Size', '', verdict.join(' · ')]

  // surface only the bundles that actually moved
  if (changed.length) {
    out.push('', '| Bundle | Gzipped | Δ |', '|---|---|---|')
    for (const { item, status } of changed)
      out.push(`| **${item.name}** | ${formatSize(item.baseGzippedSize)} → ${formatSize(item.gzippedSize)} | ${deltaCell(item, status)} |`)
  }

  // full per-bundle breakdown, grouped by category, collapsed by default
  out.push('', `<details><summary>All bundles (${data.length})</summary>`, '')
  out.push('| Bundle | Gzipped | Raw | |', '|---|---|---|---|')
  let lastCat = ''
  for (const { item, status } of rows) {
    const cat = categoryOf(item.name)
    if (cat !== lastCat) {
      out.push(`| **${cat}** | | | |`)
      lastCat = cat
    }
    const mark = status === 'new' ? '🆕' : status === 'grew' ? '🔴' : status === 'shrank' ? '🟢' : '✅'
    out.push(`| ${item.name} | ${formatSize(item.gzippedSize)} | ${formatSize(item.size)} | ${mark} |`)
  }
  out.push('', '</details>')

  const baseline = process.env.BASE_LABEL
  if (baseline)
    out.push('', `<sub>Baseline: ${baseline} · gzipped is the headline metric</sub>`)

  return out.join('\n')
}

// Support both CI (with args) and local usage (with last.json)
const args = process.argv.slice(2)

const client = fs.readFileSync(path.resolve(__dirname, 'dist/client/client/minimal.mjs'))
const server = fs.readFileSync(path.resolve(__dirname, 'dist/server/server/minimal.mjs'))
const vueClient = fs.readFileSync(path.resolve(__dirname, 'dist/vue-client/vue-client/minimal.mjs'))
const vueServer = fs.readFileSync(path.resolve(__dirname, 'dist/vue-server/vue-server/minimal.mjs'))
const schemaOrg = fs.existsSync(path.resolve(__dirname, 'dist/schema-org/schema-org/minimal.mjs'))
  ? fs.readFileSync(path.resolve(__dirname, 'dist/schema-org/schema-org/minimal.mjs'))
  : null
const schemaOrgImports = fs.existsSync(path.resolve(__dirname, 'dist/schema-org/schema-org/imports.mjs'))
  ? fs.readFileSync(path.resolve(__dirname, 'dist/schema-org/schema-org/imports.mjs'))
  : null
const schemaOrgVueMeta = fs.existsSync(path.resolve(__dirname, 'dist/schema-org/schema-org/vue-meta.mjs'))
  ? fs.readFileSync(path.resolve(__dirname, 'dist/schema-org/schema-org/vue-meta.mjs'))
  : null

let data: Array<{
  name: string
  size: number
  gzippedSize: number
  baseSize: number
  baseGzippedSize: number
}>

if (args.length >= 4) {
  // CI mode: use provided base bundle paths
  const baseClient = fs.readFileSync(args[0])
  const baseServer = fs.readFileSync(args[1])
  const baseVueClient = fs.readFileSync(args[2])
  const baseVueServer = fs.readFileSync(args[3])
  // base artifacts may be absent on the first PR that introduces a bundle (the base ref
  // predates its build config), so read defensively and let the row fall back to a 0 baseline
  const readBase = (p?: string) => (p && fs.existsSync(p) ? fs.readFileSync(p) : null)
  const baseSchemaOrg = schemaOrg ? readBase(args[4]) : null
  const baseSchemaOrgImports = schemaOrgImports ? readBase(args[5]) : null
  const baseSchemaOrgVueMeta = schemaOrgVueMeta ? readBase(args[6]) : null

  const schemaOrgRow = (name: string, current: Buffer | null, base: Buffer | null) =>
    current
      ? [{
          name,
          size: current.length,
          gzippedSize: zlib.gzipSync(current).length,
          baseSize: base?.length ?? 0,
          baseGzippedSize: base ? zlib.gzipSync(base).length : 0,
        }]
      : []

  data = [
    {
      name: 'Client (Minimal)',
      size: client.length,
      gzippedSize: zlib.gzipSync(client).length,
      baseSize: baseClient.length,
      baseGzippedSize: zlib.gzipSync(baseClient).length,
    },
    {
      name: 'Server (Minimal)',
      size: server.length,
      gzippedSize: zlib.gzipSync(server).length,
      baseSize: baseServer.length,
      baseGzippedSize: zlib.gzipSync(baseServer).length,
    },
    {
      name: 'Vue Client (Minimal)',
      size: vueClient.length,
      gzippedSize: zlib.gzipSync(vueClient).length,
      baseSize: baseVueClient.length,
      baseGzippedSize: zlib.gzipSync(baseVueClient).length,
    },
    {
      name: 'Vue Server (Minimal)',
      size: vueServer.length,
      gzippedSize: zlib.gzipSync(vueServer).length,
      baseSize: baseVueServer.length,
      baseGzippedSize: zlib.gzipSync(baseVueServer).length,
    },
    ...schemaOrgRow('Schema.org (Minimal)', schemaOrg, baseSchemaOrg),
    ...schemaOrgRow('Schema.org Imports', schemaOrgImports, baseSchemaOrgImports),
    ...schemaOrgRow('Schema.org Vue Meta', schemaOrgVueMeta, baseSchemaOrgVueMeta),
  ]
}
else {
  // Local mode: use last.json for comparison
  console.warn('⚠️  Running in local mode - using last.json for comparison\n')
  const lastStats = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'last.json'), 'utf8'))

  data = [
    {
      name: 'Client (Minimal)',
      size: client.length,
      gzippedSize: zlib.gzipSync(client).length,
      baseSize: lastStats.client.size,
      baseGzippedSize: lastStats.client.gz,
    },
    {
      name: 'Server (Minimal)',
      size: server.length,
      gzippedSize: zlib.gzipSync(server).length,
      baseSize: lastStats.server.size,
      baseGzippedSize: lastStats.server.gz,
    },
    {
      name: 'Vue Client (Minimal)',
      size: vueClient.length,
      gzippedSize: zlib.gzipSync(vueClient).length,
      baseSize: lastStats.vueClient.size,
      baseGzippedSize: lastStats.vueClient.gz,
    },
    {
      name: 'Vue Server (Minimal)',
      size: vueServer.length,
      gzippedSize: zlib.gzipSync(vueServer).length,
      baseSize: lastStats.vueServer.size,
      baseGzippedSize: lastStats.vueServer.gz,
    },
    ...(schemaOrg && lastStats.schemaOrg
      ? [{
          name: 'Schema.org (Minimal)',
          size: schemaOrg.length,
          gzippedSize: zlib.gzipSync(schemaOrg).length,
          baseSize: lastStats.schemaOrg.size,
          baseGzippedSize: lastStats.schemaOrg.gz,
        }]
      : []),
    ...(schemaOrgImports && lastStats.schemaOrgImports
      ? [{
          name: 'Schema.org Imports',
          size: schemaOrgImports.length,
          gzippedSize: zlib.gzipSync(schemaOrgImports).length,
          baseSize: lastStats.schemaOrgImports.size,
          baseGzippedSize: lastStats.schemaOrgImports.gz,
        }]
      : []),
    ...(schemaOrgVueMeta && lastStats.schemaOrgVueMeta
      ? [{
          name: 'Schema.org Vue Meta',
          size: schemaOrgVueMeta.length,
          gzippedSize: zlib.gzipSync(schemaOrgVueMeta).length,
          baseSize: lastStats.schemaOrgVueMeta.size,
          baseGzippedSize: lastStats.schemaOrgVueMeta.gz,
        }]
      : []),
  ]
}

// eslint-disable-next-line no-console
console.log(render(data))
