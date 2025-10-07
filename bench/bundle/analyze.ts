import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function formatSize(size: number): string {
  return `${Math.round(size / 102.4) / 10} kB`
}

function formatDiff(diffBytes: number): string {
  // Round to see if it's effectively zero
  const roundedKB = Math.round(Math.abs(diffBytes) / 102.4) / 10
  if (roundedKB === 0)
    return ''

  const sign = diffBytes > 0 ? '+' : ''
  const emoji = diffBytes > 0 ? '🔴' : '🟢'

  return `${emoji} ${sign}${formatSize(Math.abs(diffBytes))}`
}

interface BundleData {
  name: string
  size: number
  gzippedSize: number
  baseSize: number
  baseGzippedSize: number
  sizeDiffPercent?: number
  gzDiffPercent?: number
}

function generateMarkdownTable(data: BundleData[]): string {
  const headers = ['Bundle', 'Size', 'Gzipped']
  const rows = data.map((item) => {
    const sizeDiffBytes = item.size - item.baseSize
    const sizeDiffPercent = item.baseSize > 0 ? ((sizeDiffBytes / item.baseSize) * 100) : 0
    const gzDiffBytes = item.gzippedSize - item.baseGzippedSize
    const gzDiffPercent = item.baseGzippedSize > 0 ? ((gzDiffBytes / item.baseGzippedSize) * 100) : 0

    // Store percentages for summary
    item.sizeDiffPercent = sizeDiffPercent
    item.gzDiffPercent = gzDiffPercent

    // Format size column with change
    const sizeChange = formatDiff(sizeDiffBytes)
    const sizeCell = sizeChange
      ? `${formatSize(item.baseSize)} → ${formatSize(item.size)} ${sizeChange}`
      : `${formatSize(item.size)}`

    // Format gzipped column with change
    const gzChange = formatDiff(gzDiffBytes)
    const gzCell = gzChange
      ? `${formatSize(item.baseGzippedSize)} → ${formatSize(item.gzippedSize)} ${gzChange}`
      : `${formatSize(item.gzippedSize)}`

    return [
      `**${item.name}**`,
      sizeCell,
      gzCell,
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
// eslint-disable-next-line node/prefer-global/process
const args = process.argv.slice(2)

const client = fs.readFileSync(path.resolve(__dirname, 'dist/client/client/minimal.mjs'))
const server = fs.readFileSync(path.resolve(__dirname, 'dist/server/server/minimal.mjs'))
const vueClient = fs.readFileSync(path.resolve(__dirname, 'dist/vue-client/vue-client/minimal.mjs'))
const vueServer = fs.readFileSync(path.resolve(__dirname, 'dist/vue-server/vue-server/minimal.mjs'))

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
  ]
}

// eslint-disable-next-line no-console
console.log(generateMarkdownTable(data))
