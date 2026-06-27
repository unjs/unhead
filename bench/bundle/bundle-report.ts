import type { Buffer } from 'node:buffer'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import { BUNDLES } from './bundles'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, 'dist')

export interface BundleData {
  name: string
  category: string
  size: number
  gzippedSize: number
  baseSize: number
  baseGzippedSize: number
}

type Status = 'new' | 'grew' | 'shrank' | 'same'

// gzipped deltas below this are minifier jitter, not a real change
const GZ_NOISE_BYTES = 16

function formatSize(size: number): string {
  return `${Math.round(size / 102.4) / 10} kB`
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

export function renderBundleReport(data: BundleData[]): string {
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
    if (item.category !== lastCat) {
      out.push(`| **${item.category}** | | | |`)
      lastCat = item.category
    }
    const mark = status === 'new' ? '🆕' : status === 'grew' ? '🔴' : status === 'shrank' ? '🟢' : '✅'
    out.push(`| ${item.name} | ${formatSize(item.gzippedSize)} | ${formatSize(item.size)} | ${mark} |`)
  }
  out.push('', '</details>')

  return out.join('\n')
}

function gz(buf: Buffer): number {
  return zlib.gzipSync(buf).length
}

function readBundle(dir: string, file: string): Buffer | null {
  const p = path.resolve(dir, file)
  return fs.existsSync(p) ? fs.readFileSync(p) : null
}

// CI compares the PR's dist against a full base-branch dist dir (BASE_DIST);
// locally, fall back to the committed last.json baseline.
export function collectBundleData(): BundleData[] {
  const baseDist = process.env.BASE_DIST
  const lastStats: Record<string, { size: number, gz: number }> | null = baseDist
    ? null
    : JSON.parse(fs.readFileSync(path.resolve(__dirname, 'last.json'), 'utf8'))

  const data: BundleData[] = []
  for (const spec of BUNDLES) {
    const current = readBundle(distDir, spec.file)
    if (!current) {
      if (spec.required)
        throw new Error(`Missing required bundle: ${spec.file}`)
      continue
    }
    let baseSize = 0
    let baseGzippedSize = 0
    if (baseDist) {
      const base = readBundle(baseDist, spec.file)
      if (base) {
        baseSize = base.length
        baseGzippedSize = gz(base)
      }
    }
    else if (lastStats?.[spec.id]) {
      baseSize = lastStats[spec.id].size
      baseGzippedSize = lastStats[spec.id].gz
    }
    data.push({
      name: spec.name,
      category: spec.category,
      size: current.length,
      gzippedSize: gz(current),
      baseSize,
      baseGzippedSize,
    })
  }
  return data
}
