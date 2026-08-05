// Isolated differential harness (esbuild + gzip -9 CLI), same methodology
// V4_DESIGN.md 15.1/15.2 uses for every other v4 bundle-size claim in this
// repo. Nuxt itself cannot answer "what does the head runtime cost THIS
// route" directly: the head plugin is app-wide, not per-route-splittable
// (see the report's honest-limits section), so real `nuxt build` output
// cannot isolate the marginal byte cost of one route's head runtime without
// this kind of side-by-side minimal bundle.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'

const dir = fileURLToPath(new URL('.', import.meta.url))

async function bundle(entry, { externalVue } = {}) {
  const result = await esbuild.build({
    entryPoints: [join(dir, entry)],
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    logLevel: 'silent',
    external: externalVue ? ['vue'] : [],
    // Match a real production Vite/Nuxt client build: without these, Vue
    // keeps its dev-mode warning/devtools/hydration-mismatch branches, which
    // dwarfs the head-runtime delta this harness exists to isolate.
    define: {
      'process.env.NODE_ENV': '"production"',
      '__VUE_OPTIONS_API__': 'false',
      '__VUE_PROD_DEVTOOLS__': 'false',
      '__VUE_PROD_HYDRATION_MISMATCH_DETAILS__': 'false',
    },
  })
  return result.outputFiles[0].contents
}

function gzipSize(buf) {
  const tmp = mkdtempSync(join(tmpdir(), 'v4-bench-'))
  const file = join(tmp, 'bundle.js')
  writeFileSync(file, buf)
  execFileSync('gzip', ['-9', '-k', '-f', file])
  const size = readFileSync(`${file}.gz`).byteLength
  rmSync(tmp, { recursive: true, force: true })
  return size
}

async function report(label, opts) {
  const withRuntime = await bundle('with-runtime.entry.ts', opts)
  const withoutRuntime = await bundle('without-runtime.entry.ts', opts)
  const withRuntimeGz = gzipSize(withRuntime)
  const withoutRuntimeGz = gzipSize(withoutRuntime)
  const delta = withRuntimeGz - withoutRuntimeGz
  console.log(`\n=== ${label} ===`)
  console.log(`with head runtime (createHead + useSeoMeta + useHead, /about's actual calls): ${withRuntime.length} raw / ${withRuntimeGz} gz`)
  console.log(`without head runtime (payload baked, no @unhead/vue import at all):            ${withoutRuntime.length} raw / ${withoutRuntimeGz} gz`)
  console.log(`delta: ${delta} B gz (${(100 * delta / withRuntimeGz).toFixed(1)}% of the with-runtime bundle)`)
}

// Two views: Vue bundled in (the actual bytes a browser downloads for this
// route's final client chunk) and Vue external (comparable to every other
// bundle-size figure in V4_DESIGN.md, which externalizes vue/hookable).
await report('final client bundle (esbuild + gzip -9, Vue bundled in)', { externalVue: false })
await report('unhead-only marginal cost (Vue external, matches V4_DESIGN.md convention)', { externalVue: true })
