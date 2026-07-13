import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import { BUNDLES } from './bundles'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, 'dist')
const lastJsonPath = path.resolve(__dirname, 'last.json')

interface Stats {
  size: number
  gz: number
  br?: number
}

// Merge, don't overwrite: only bundles that were actually rebuilt this run (their dist
// file exists) get fresh numbers. Anything else keeps its previously committed value
// untouched, so a partial build (e.g. only the self-contained fixtures) can't perturb
// baselines it never regenerated.
const oldStats: Record<string, Stats> = fs.existsSync(lastJsonPath)
  ? JSON.parse(fs.readFileSync(lastJsonPath, 'utf8'))
  : {}

const newStats: Record<string, Stats> = { ...oldStats }
for (const spec of BUNDLES) {
  const p = path.resolve(distDir, spec.file)
  if (!fs.existsSync(p)) {
    if (spec.required && !oldStats[spec.id])
      throw new Error(`Missing required bundle: ${spec.file}`)
    continue
  }
  const buf = fs.readFileSync(p)
  newStats[spec.id] = {
    size: buf.length,
    gz: zlib.gzipSync(buf).length,
    br: zlib.brotliCompressSync(buf).length,
  }
}

// eslint-disable-next-line no-console
console.table(newStats)

fs.writeFileSync(
  lastJsonPath,
  `${JSON.stringify(newStats, null, 2)}\n`,
  'utf8',
)

// eslint-disable-next-line no-console
console.log('Updated last.json with new bundle stats')
