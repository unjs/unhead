import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { unheadDevtools } from '../src/devtools/vite'
import { CreateHeadTransform, createHeadTransformContext } from '../src/unplugin/CreateHeadTransform'

const IMPORT_RE = /import \{ devtoolsPlugin as __unhead_devtoolsPlugin \} from ("(?:[^"\\]|\\.)+")/

const RENDERER = `import { createHead } from '@unhead/vue'\nexport const head = createHead()\n`

/**
 * An app whose `createHead()` call site lives in a package that only depends on
 * a framework package, so `@unhead/bundler` is not resolvable from there.
 */
function createIsolatedApp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'unhead-isolated-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'renderer', dependencies: { '@unhead/vue': '*' } }))
  const vueDir = join(dir, 'node_modules/@unhead/vue')
  mkdirSync(vueDir, { recursive: true })
  writeFileSync(join(vueDir, 'package.json'), JSON.stringify({ name: '@unhead/vue', main: 'index.js' }))
  writeFileSync(join(vueDir, 'index.js'), 'module.exports = { createHead: () => ({}) }')
  writeFileSync(join(dir, 'renderer.ts'), RENDERER)
  return dir
}

/**
 * Resolves in a child process, because vitest patches `createRequire` to use
 * Vite's resolver and injects a `NODE_PATH` that makes every hoisted pnpm
 * package resolvable from anywhere.
 */
function resolveFrom(importer: string, specifier: string): string | undefined {
  const script = `const { createRequire } = require('node:module');`
    + `try { process.stdout.write(createRequire(${JSON.stringify(importer)}).resolve(${JSON.stringify(specifier)})) } catch {}`
  const { NODE_PATH: _, ...env } = process.env
  return execFileSync(process.execPath, ['-e', script], { encoding: 'utf-8', env }) || undefined
}

describe('devtools runtime plugin injection', () => {
  it('injects a specifier resolvable from the transformed module', async () => {
    const appDir = createIsolatedApp()
    const importer = join(appDir, 'renderer.ts')
    expect(resolveFrom(importer, '@unhead/bundler')).toBeUndefined()

    const ctx = createHeadTransformContext()
    const devtools = unheadDevtools({ _ctx: ctx }) as any
    await devtools.configResolved({ root: appDir, devtools: { enabled: true }, plugins: [] })

    const transform = CreateHeadTransform(ctx) as any
    transform.configResolved({ root: appDir })
    const result = transform.transform.handler.call(
      { environment: { config: { consumer: 'server' } } },
      RENDERER,
      importer,
    )

    const literal = result.code.match(IMPORT_RE)?.[1]
    expect(literal).toBeTruthy()
    const source = JSON.parse(literal!) as string
    expect(resolveFrom(importer, source!)).toBeTruthy()
  })
})
