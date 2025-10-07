import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import zlib from 'node:zlib'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function formatSize(size: number): string {
  return `${Math.round(size / 102.4) / 10} kB`
}

function formatDiff(diffBytes: number, diffPercent: number): string {
  if (diffBytes === 0)
    return '0 B (0%)'

  const sign = diffBytes > 0 ? '+' : ''
  const emoji = diffBytes > 0 ? '🔴' : '🟢'
  const percent = diffPercent.toFixed(2)

  return `${emoji} ${sign}${formatSize(Math.abs(diffBytes))} (${sign}${percent}%)`
}

function generateMarkdownTable(data: Array<{
  name: string
  size: number
  gzippedSize: number
  baseSize: number
  baseGzippedSize: number
}>): string {
  const headers = ['Bundle', 'Size', 'Gzipped', 'Size Change', 'Gzipped Change']
  const rows = data.map((item) => {
    const sizeDiffBytes = item.size - item.baseSize
    const sizeDiffPercent = item.baseSize > 0 ? ((sizeDiffBytes / item.baseSize) * 100) : 0
    const gzDiffBytes = item.gzippedSize - item.baseGzippedSize
    const gzDiffPercent = item.baseGzippedSize > 0 ? ((gzDiffBytes / item.baseGzippedSize) * 100) : 0

    return [
      `**${item.name}**`,
      `${formatSize(item.size)}`,
      `${formatSize(item.gzippedSize)}`,
      formatDiff(sizeDiffBytes, sizeDiffPercent),
      formatDiff(gzDiffBytes, gzDiffPercent),
    ]
  })

  const table = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${row.join(' | ')} |`),
  ]
  return table.join('\n')
}

// Support both CI (with args) and local usage (with last.json)
const args = process.argv.slice(2)

const client = fs.readFileSync(path.resolve(__dirname, 'dist/client/client/minimal.mjs'))
const server = fs.readFileSync(path.resolve(__dirname, 'dist/server/server/minimal.mjs'))

let data: Array<{
  name: string
  size: number
  gzippedSize: number
  baseSize: number
  baseGzippedSize: number
}>

if (args.length >= 2) {
  // CI mode: use provided base bundle paths
  const baseClient = fs.readFileSync(args[0])
  const baseServer = fs.readFileSync(args[1])

  data = [
    {
      name: 'Client',
      size: client.length,
      gzippedSize: zlib.gzipSync(client).length,
      baseSize: baseClient.length,
      baseGzippedSize: zlib.gzipSync(baseClient).length,
    },
    {
      name: 'Server',
      size: server.length,
      gzippedSize: zlib.gzipSync(server).length,
      baseSize: baseServer.length,
      baseGzippedSize: zlib.gzipSync(baseServer).length,
    },
  ]
}
else {
  // Local mode: use last.json for comparison
  console.warn('⚠️  Running in local mode - using last.json for comparison\n')
  const lastStats = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'last.json'), 'utf8'))

  data = [
    {
      name: 'Client',
      size: client.length,
      gzippedSize: zlib.gzipSync(client).length,
      baseSize: lastStats.client.size,
      baseGzippedSize: lastStats.client.gz,
    },
    {
      name: 'Server',
      size: server.length,
      gzippedSize: zlib.gzipSync(server).length,
      baseSize: lastStats.server.size,
      baseGzippedSize: lastStats.server.gz,
    },
  ]
}

// @ts-expect-error untyped
// eslint-disable-next-line no-console
console.log(generateMarkdownTable(data))
