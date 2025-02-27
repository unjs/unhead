import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

function formatSize(size: number): string {
  return `${Math.round(size / 102.4) / 10} kB`
}

function calculatePercentageDiff(current: number, previous: number): string {
  if (previous === 0)
    return 'N/A'
  const diff = ((current - previous) / previous) * 100
  return `${diff.toFixed(2)}%`
}

function generateMarkdownTable(data: { name: string, size: number, gzippedSize: number, sizeDiff: string, gzippedSizeDiff: string, sizeDiffBytes: string, gzipSizeDiffBytes: string }[]): string {
  const headers = ['File', 'Size', 'Gzipped Size', 'Size Diff', 'Gzipped Size Diff']
  const rows = data.map(item => [item.name, `${formatSize(item.size)} (${item.size} B)`, `${formatSize(item.gzippedSize)} (${item.gzippedSize} B)`, `${item.sizeDiff} (${item.sizeDiffBytes} B)`, `${item.gzippedSizeDiff} ( ${item.gzipSizeDiffBytes} B)`])
  const table = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${row.join(' | ')} |`),
  ]
  return table.join('\n')
}

const client = fs.readFileSync(path.resolve(__dirname, 'dist/client/client/minimal.mjs'))
const server = fs.readFileSync(path.resolve(__dirname, 'dist/server/server/minimal.mjs'))

const lastStats = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'last.json'), 'utf8'))

const data = [
  {
    name: 'Client',
    size: client.length,
    gzippedSize: zlib.gzipSync(client).length,
    sizeDiff: calculatePercentageDiff(client.length, lastStats.client.size),
    sizeDiffBytes: client.length - lastStats.client.size,
    gzippedSizeDiff: calculatePercentageDiff(zlib.gzipSync(client).length, lastStats.client.gz),
    gzipSizeDiffBytes: zlib.gzipSync(client).length - lastStats.client.gz,
  },
  {
    name: 'Server',
    size: server.length,
    gzippedSize: zlib.gzipSync(server).length,
    sizeDiffBytes: server.length - lastStats.server.size,
    sizeDiff: calculatePercentageDiff(server.length, lastStats.server.size),
    gzipSizeDiffBytes: zlib.gzipSync(server).length - lastStats.server.gz,
    gzippedSizeDiff: calculatePercentageDiff(zlib.gzipSync(server).length, lastStats.server.gz),
  },
]

// @ts-expect-error untyped
// eslint-disable-next-line no-console
console.log(generateMarkdownTable(data))
