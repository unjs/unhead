import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, relative, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, constants } from 'node:zlib'

interface ClientAsset {
  file: string
  isEntry?: boolean
  src?: string
}

const [checkout, measurement] = process.argv.slice(2)
assert(checkout && isAbsolute(checkout) && measurement && isAbsolute(measurement), 'Usage: node measure-entry.ts <absolute checkout> <absolute measurement path>')

const fixture = import.meta.dirname
const modules = join(fixture, 'node_modules')
const buildDir = join(fixture, '.nuxt')
const lock = join(fixture, '.fieldnote-entry.lock')
const output = join(lock, 'output')

const fixtureRequire = createRequire(join(fixture, 'package.json'))
const nuxtRequire = createRequire(fileURLToPath(import.meta.resolve('nuxt')))
const vueRequire = createRequire(fixtureRequire.resolve('@unhead/vue'))
const packages = [
  { name: 'unhead', directory: 'unhead', resolvers: [nuxtRequire, vueRequire] },
  { name: '@unhead/vue', directory: 'vue', resolvers: [nuxtRequire] },
  { name: '@unhead/bundler', directory: 'bundler', resolvers: [vueRequire] },
]

async function restorePackages(replaced: { installedDist: string, backup: string }[]) {
  const restoration = await Promise.allSettled(replaced.map(async ({ installedDist, backup }) => {
    await rm(installedDist, { recursive: true, force: true })
    await rename(backup, installedDist)
  }))
  const failures = restoration.filter(restored => restored.status === 'rejected')
  if (failures.length)
    throw new AggregateError(failures.map(failure => failure.reason), `Could not restore Fieldnote packages. Backups are in ${lock}`)
  await rm(lock, { recursive: true })
}

async function measureEntry(): Promise<number> {
  const replacements = await Promise.all(packages.map(async ({ name, directory, resolvers }) => {
    const entry = fixtureRequire.resolve(name)
    for (const resolver of resolvers)
      assert.equal(resolver.resolve(name), entry, `Multiple installations of ${name}`)

    const installedDist = dirname(entry)
    const installedPath = relative(modules, installedDist)
    assert(installedPath && !isAbsolute(installedPath) && installedPath.split(sep)[0] !== '..', `Expected ${name} inside the fixture`)

    const localPackage = join(checkout, 'packages', directory)
    const manifest = JSON.parse(await readFile(join(localPackage, 'package.json'), 'utf8'))
    assert.equal(manifest.name, name, `Unexpected package in ${localPackage}`)
    const localDist = join(localPackage, 'dist')
    await readFile(join(localDist, 'index.mjs'))
    return { installedDist, localDist, backup: join(lock, directory) }
  }))

  await mkdir(lock)
  const replaced: typeof replacements = []
  try {
    for (const replacement of replacements) {
      await rename(replacement.installedDist, replacement.backup)
      replaced.push(replacement)
      await cp(replacement.localDist, replacement.installedDist, { recursive: true })
    }

    await rm(buildDir, { recursive: true, force: true })
    const build = spawnSync('pnpm', ['exec', 'nuxt', 'build'], {
      cwd: fixture,
      env: { ...process.env, NUXT_BENCH_OUTPUT_DIR: output, NUXT_TELEMETRY_DISABLED: '1' },
      stdio: 'inherit',
    })
    if (build.error)
      throw build.error
    assert.equal(build.status, 0, 'Fieldnote Nuxt build failed')

    const { default: clientManifest } = fixtureRequire(join(buildDir, 'dist/server/client.manifest.mjs')) as {
      default: Record<string, ClientAsset>
    }
    const entries = Object.values(clientManifest)
      .filter(asset => asset.isEntry && asset.src?.endsWith('/nuxt/dist/app/entry.js'))
    assert.equal(entries.length, 1, 'Expected one Fieldnote Nuxt entry')
    const file = entries[0].file
    assert(/^[\w.-]+\.js$/.test(file), 'Expected a JavaScript entry asset filename')
    const bytes = await readFile(join(output, 'public', '_nuxt', file))
    assert(bytes.length, 'The Fieldnote Nuxt entry is empty')
    return brotliCompressSync(bytes, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length
  }
  finally {
    await restorePackages(replaced)
  }
}

async function main() {
  const size = await measureEntry()
  const staging = await mkdtemp(join(dirname(measurement), '.fieldnote-entry-'))
  try {
    const stagedMeasurement = join(staging, 'brotli.json')
    await writeFile(stagedMeasurement, `${JSON.stringify(size)}\n`)
    await rename(stagedMeasurement, measurement)
  }
  finally {
    await rm(staging, { recursive: true })
  }
}

void main()
