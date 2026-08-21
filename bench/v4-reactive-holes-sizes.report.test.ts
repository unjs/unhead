/**
 * Size-only report (no CPU timing) for the reactive-holes prototype
 * (V4_DESIGN.md 15, "reactive holes"). Compares a representative reactive
 * page (a title and two metas driven by refs, the exact shape a v4i18n page
 * would author) under two real build paths:
 *
 *  1. loose      — today's fallback: the trusted `useHead` call is on a
 *                  compiled import but contains getters, so nothing here
 *                  changed it; it ships `@unhead/vue/v4/client` + the loose
 *                  `useHead` composable (L1 compiler, walkResolver,
 *                  watchEffect-driven runtime resolve).
 *  2. compiled   — this investigation: the same call site, run through the
 *                  real `V4PlanTransform` (client, `client: true`), producing
 *                  a sealed plan plus a call-site fills thunk; ships
 *                  `@unhead/vue/v4/client-compiled` + the compiled `useHead`
 *                  with its watch-driven fill-binding, no L1 compiler at all.
 *
 * Run: npx vitest run bench/v4-reactive-holes-sizes.report.test.ts --pool=threads
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { afterAll, describe, expect, it } from 'vitest'
import { V4PlanTransform } from '../packages/bundler/src/unplugin/V4PlanTransform'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const tmpDir = join(here, '.reactive-holes-tmp')

function resolveEsbuild() {
  const req = createRequire(join(repoRoot, 'packages/unhead/package.json'))
  try {
    return req('esbuild')
  }
  catch {
    // not hoisted next to unhead; fall through to the pnpm store lookup below
  }
  const store = join(repoRoot, 'node_modules/.pnpm')
  const hits = readdirSync(store).filter((d: string) => d.startsWith('esbuild@')).sort()
  if (!hits.length)
    throw new Error('esbuild not found; pnpm install first')
  return createRequire(import.meta.url)(join(store, hits.at(-1)!, 'node_modules/esbuild'))
}

async function bundleGzip(entry: string): Promise<{ min: number, gzip: number }> {
  const esbuild = resolveEsbuild()
  const r = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    write: false,
    format: 'esm',
    logLevel: 'silent',
    external: ['vue', 'vue/server-renderer', '@vue/shared', '@vue/server-renderer'],
    define: { 'process.env.NODE_ENV': '"production"' },
  })
  const code = r.outputFiles[0].contents
  return { min: code.length, gzip: gzipSync(code, { level: 9 }).length }
}

// The page an author writes: one static-shaped useHead call, three reactive
// values (title + two metas), the eligibility class this investigation adds.
const APP_BODY = `
const title = ref('Install')
const description = ref('How to install the package.')
const ogTitle = ref('Install | Docs')

useHead({
  title: () => title.value,
  meta: [
    { name: 'description', content: () => description.value },
    { property: 'og:title', content: () => ogTitle.value },
  ],
})
`

describe('reactive holes: app-level size report (real V4PlanTransform output)', () => {
  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('compiled-with-reactive-holes ships far less than the loose fallback for the same reactive page', async () => {
    mkdirSync(tmpDir, { recursive: true })

    // 1. loose: the call as it ships today, on the loose composable. This IS
    //    the real fallback: before this investigation, and still whenever a
    //    call is ineligible, a getter forces the whole entry (and therefore
    //    the app's head runtime) onto this path.
    const looseSource = [
      `import { createHead } from '../../packages/vue/src/v4/client'`,
      `import { useHead } from '../../packages/vue/src/v4/composables'`,
      `import { ref } from 'vue'`,
      `export const head = createHead()`,
      APP_BODY,
    ].join('\n')
    const loosePath = join(tmpDir, 'loose-app.ts')
    writeFileSync(loosePath, looseSource)

    // 2. compiled: the identical call, authored against the compiled entry
    //    points, run through the real bundler transform (client consumer,
    //    client plan rendering enabled) exactly as Vite would invoke it.
    const compiledSourceIn = [
      `import { createHead } from '../../packages/vue/src/v4/client-compiled'`,
      `import { useHead } from '../../packages/vue/src/v4/compiled'`,
      `import { ref } from 'vue'`,
      `export const head = createHead()`,
      APP_BODY,
    ].join('\n')

    const plugin = V4PlanTransform.vite({
      client: true,
      importPaths: ['../../packages/vue/src/v4/compiled'],
    }) as any
    const ctx = { environment: { config: { consumer: 'client' } } }
    const transformed = await plugin.transform.handler.call(ctx, compiledSourceIn, join(tmpDir, 'compiled-app.ts'))
    expect(transformed).toBeDefined()
    // proof the reactive call actually compiled, not a silent passthrough
    expect(transformed.code).toContain('fills: () => [title.value,description.value,ogTitle.value]')
    expect(transformed.code).not.toContain('() => title.value')

    const compiledPath = join(tmpDir, 'compiled-app.ts')
    writeFileSync(compiledPath, transformed.code)

    const loose = await bundleGzip(loosePath)
    const compiled = await bundleGzip(compiledPath)

    // eslint-disable-next-line no-console
    console.log(`\nReactive page (title + 2 metas, all ref-backed), esbuild --minify, gzip -9, vue external:`)
    // eslint-disable-next-line no-console
    console.log(`  loose (today's fallback):         min=${loose.min}B gz=${loose.gzip}B`)
    // eslint-disable-next-line no-console
    console.log(`  compiled (reactive holes):        min=${compiled.min}B gz=${compiled.gzip}B`)
    // eslint-disable-next-line no-console
    console.log(`  saving:                           ${loose.min - compiled.min} min / ${loose.gzip - compiled.gzip} gz (${(100 * (1 - compiled.gzip / loose.gzip)).toFixed(1)}%)`)

    expect(compiled.gzip).toBeLessThan(loose.gzip)
    // headline claim: reactive apps land near the sealed-compiled floor
    // (~3.9 kB base + this page's own plan/fills bytes), not the loose-Vue
    // floor (5.5-6.2 kB, V4_DESIGN.md 15.2/15.5). Assert the shape of the
    // claim (a large majority saving) rather than an exact byte count, which
    // moves with esbuild/vue versions.
    expect(compiled.gzip).toBeLessThan(4800)
    expect(1 - compiled.gzip / loose.gzip).toBeGreaterThan(0.25)
  })
})
