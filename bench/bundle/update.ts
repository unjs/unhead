import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const client = fs.readFileSync(path.resolve(__dirname, 'dist/client/client/minimal.mjs'))
const server = fs.readFileSync(path.resolve(__dirname, 'dist/server/server/minimal.mjs'))
const vueClient = fs.readFileSync(path.resolve(__dirname, 'dist/vue-client/vue-client/minimal.mjs'))
const vueServer = fs.readFileSync(path.resolve(__dirname, 'dist/vue-server/vue-server/minimal.mjs'))

const newStats = {
  client: {
    size: client.length,
    gz: zlib.gzipSync(client).length,
  },
  server: {
    size: server.length,
    gz: zlib.gzipSync(server).length,
  },
  vueClient: {
    size: vueClient.length,
    gz: zlib.gzipSync(vueClient).length,
  },
  vueServer: {
    size: vueServer.length,
    gz: zlib.gzipSync(vueServer).length,
  },
}

// eslint-disable-next-line no-console
console.table(newStats)

// Write the new stats to last.json
fs.writeFileSync(
  path.resolve(__dirname, 'last.json'),
  `${JSON.stringify(newStats, null, 2)}\n`,
  'utf8',
)

// eslint-disable-next-line no-console
console.log('Updated last.json with new bundle stats')
