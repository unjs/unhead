/**
 * PRERENDER-TRACE-AS-SCANNER, Nitro half. Registered on the runtime
 * `NitroApp` (not the build-time `Nitro`): `prerender:generate` only exists
 * on the build-time object that drives the crawler, which has no
 * `localFetch`; the actual per-route render happens inside the SEPARATE
 * "nitro-prerender" preset server that the crawler dynamically imports and
 * calls `localFetch` against. Gating on `import.meta.prerender` (true only
 * inside that preset build) means this whole file is a no-op in the shipped
 * production server: no per-request cost, no memory growth from an
 * unconsumed trace registry.
 *
 * MEASURED, not assumed: the double-render was first attempted by hooking
 * `render:html` and firing a second `localFetch` for the same route from
 * inside the hook. That fetch consistently 508'd with "Loop detected while
 * prerendering": Nuxt's own render handler wraps every render in an
 * `AsyncLocalStorage.run([...stack, url], ...)` and throws if the URL is
 * already on that stack (`@nuxt/nitro-server` renderer.mjs). A nested
 * `localFetch` for the SAME url, called from inside the first render's own
 * `render:html` hook, is still inside that ALS run, so it looks
 * indistinguishable from the exact runaway-`useFetch` loop the guard exists
 * to catch. Node's AsyncLocalStorage propagates through timers and
 * microtasks alike, so deferring the second fetch with `setImmediate` does
 * not escape it either; only a call that is not a descendant of that
 * `.run()` does. The fix: drive both renders from this plugin's own
 * top-level setup body instead of from a hook nested inside a render. Setup
 * runs once, before Nitro's crawler issues its first request, so neither
 * call is ever nested inside an active render's ALS stack.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { combineAttempts, toAttempt } from '../../module/head-trace'
import { scanScriptForClientOnlyHead } from '../../module/scan-client-only-head'
import { takeAttempts } from '../../module/head-trace-registry'

// Prototype-grade hardcode: a real integration resolves route -> component
// file from Nuxt's page manifest. Flagged explicitly (task RULES: no silent
// hacks) rather than papered over; see the accompanying report.
const ROUTE_SOURCE_FILES: Record<string, string> = {
  '/': 'app/pages/index.vue',
  '/about': 'app/pages/about.vue',
  '/trap': 'app/pages/trap.vue',
}

// process.cwd() is the project root for the whole `nuxt build` invocation,
// including while this code runs inside the dynamically-imported
// nitro-prerender server (same Node process, no subprocess spawn). Nitro's
// default `output.publicDir` is `.output/public`; a production integration
// should thread `nitro.options.output.publicDir` through instead of
// hardcoding it, which requires wiring at the Nuxt-module (build-time)
// layer since the runtime NitroApp does not expose build options.
const MANIFEST_PATH = join(process.cwd(), '.output/public/route-head-manifest.json')

function flushManifest(manifest: Record<string, ReturnType<typeof combineAttempts>>): void {
  mkdirSync(join(process.cwd(), '.output/public'), { recursive: true })
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
}

export default defineNitroPlugin(async (nitroApp) => {
  if (!import.meta.prerender)
    return

  const manifest: Record<string, ReturnType<typeof combineAttempts>> = {}

  // Sequential on purpose: takeAttempts() must not race a second route's
  // pushAttempt() landing in between. Nitro's own crawler still renders each
  // tracked route again afterwards (they are also in nitro.prerender.routes,
  // so their real static/*.html output gets written); that render's attempt
  // sometimes lands here too (observed 3 attempts, not 2, depending on
  // scheduling) because plugin setup and the crawler's first request are not
  // strictly ordered. combineAttempts checks every attempt it is given, so
  // an extra concurrent render only strengthens the determinism proof; it is
  // never silently dropped.
  for (const [route, sourceFile] of Object.entries(ROUTE_SOURCE_FILES)) {
    await nitroApp.localFetch(route, { headers: { 'x-nitro-prerender': route } })
    await nitroApp.localFetch(route, { headers: { 'x-nitro-prerender': route } })

    const attempts = takeAttempts(route)
    if (attempts.length < 2) {
      // RULES: never silently skip a route we're supposed to trace.
      console.error(`[v4-head-manifest] expected >=2 head-trace attempts for "${route}", got ${attempts.length}; the wiring between the app plugin and this Nitro plugin is broken for this route.`)
      continue
    }

    const source = readFileSync(join(process.cwd(), sourceFile), 'utf-8')
    const disqualifiers = scanScriptForClientOnlyHead(sourceFile, source)

    const entry = combineAttempts(route, attempts.map(toAttempt), disqualifiers)
    manifest[route] = entry
    console.log(`[v4-head-manifest] ${route}: deterministic=${entry.deterministic} classification=${entry.classification} runtimeOmittable=${entry.runtimeOmittable}${disqualifiers.length ? ` disqualifiers=${disqualifiers.length}` : ''}`)
    flushManifest(manifest)
  }
})
