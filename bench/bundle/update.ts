import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import { BUNDLES } from './bundles'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, 'dist')

const newStats: Record<string, { size: number, gz: number }> = {}
for (const spec of BUNDLES) {
  const p = path.resolve(distDir, spec.file)
  if (!fs.existsSync(p)) {
    if (spec.required)
      throw new Error(`Missing required bundle: ${spec.file}`)
    continue
  }
  const buf = fs.readFileSync(p)
  newStats[spec.id] = { size: buf.length, gz: zlib.gzipSync(buf).length }
}

// eslint-disable-next-line no-console
console.table(newStats)

fs.writeFileSync(
  path.resolve(__dirname, 'last.json'),
  `${JSON.stringify(newStats, null, 2)}\n`,
  'utf8',
)

// eslint-disable-next-line no-console
console.log('Updated last.json with new bundle stats')
