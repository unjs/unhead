/**
 * PRERENDER-TRACE-AS-SCANNER: build-time head manifest from execution trace.
 *
 * The sidestep this prototype tests: instead of writing a static Nuxt
 * analyzer (definePageMeta parsing, layout resolution, route rules) to
 * extract `RouteHeadSource[]` for `emitRouteHead` (V4_DESIGN.md 15.3, the
 * piece flagged as "does not exist"), let Nuxt's prerender crawler execute
 * every route for real, capture the head instance's registered state with
 * `recordRouteHead`, and prove the rendered payload is reproducible by
 * rendering the SAME route twice and hashing the output. Equal hashes across
 * two independent renders is empirical proof of no per-request nondeterminism
 * (timestamps, random ids, request-specific data) feeding the head; it says
 * nothing about client-only mutation, which `scanScriptForClientOnlyHead`
 * covers separately.
 *
 * Two axes are kept deliberately separate and must not be conflated:
 * - `recordedKind` ('static' | 'dynamic'): recordRouteHead's own contract,
 *   "was every entry pushed as a prebuilt plan array". This is a build-time
 *   plan-provenance check, not a general dynamism check: an app that never
 *   runs the bundler's plan-compiler (like this trial app) will see
 *   'dynamic' on every route, including ones with fully static content,
 *   because a plain `useHead({ title: 'x' })` object literal is loose input.
 *   This is not a bug in recordRouteHead; it is answering a narrower
 *   question than "is this route's content deterministic".
 * - `deterministic`: this prototype's own signal, hash(render 1) ===
 *   hash(render 2). This is what actually gates shipping the prebaked
 *   payload here, independent of whether a plan-compiler ran.
 */
import type { RecordedRouteHead } from 'unhead/v4/record'
import type { SSRPayload } from 'unhead/v4/server'
import { createHash } from 'node:crypto'

export interface HeadAttempt {
  recorded: RecordedRouteHead
  hash: string
}

/** Stable hash of an SSR payload. SSRPayload is a fixed 5-key object literal
 * built by one code path (renderSSRHead), so JSON.stringify key order is
 * deterministic across calls; no manual key-sorting is needed. */
export function hashPayload(payload: SSRPayload): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16)
}

export function toAttempt(recorded: RecordedRouteHead): HeadAttempt {
  return { recorded, hash: hashPayload(recorded.payload) }
}

export type RouteClassification = 'static' | 'dynamic'

export interface RouteManifestEntry {
  route: string
  /** hashes.every(h === hashes[0]); this prototype's determinism proof. */
  deterministic: boolean
  /** recordRouteHead's plan-provenance verdict; see module doc. */
  classification: RouteClassification
  /** recordRouteHead's reason when classification is 'dynamic'. */
  reason?: string
  /** Client-only head-composable findings from scanScriptForClientOnlyHead;
   * non-empty forces runtimeOmittable false even when deterministic. */
  disqualifiers: string[]
  /** deterministic && disqualifiers.length === 0: the build decision this
   * whole prototype exists to answer. */
  runtimeOmittable: boolean
  /** One hash per independent render that fed this entry, in render order. */
  hashes: string[]
  /** The prebaked SSR payload, present only when runtimeOmittable. */
  payload?: SSRPayload
}

/**
 * Combine two-or-more independent renders of the same route into one
 * manifest entry. Two is the minimum the sidestep needs to call a route
 * deterministic; extras (e.g. a route the Nitro crawler also rendered on its
 * own, on top of the two this prototype forced) only strengthen the proof,
 * so every attempt handed in is checked, not just the first pair.
 *
 * RULES: never silent. A hash mismatch or a disqualifier always produces a
 * loud console.error naming the route and the reason, even though the
 * manifest entry itself also carries the same information machine-readably.
 */
export function combineAttempts(route: string, attempts: HeadAttempt[], disqualifiers: string[]): RouteManifestEntry {
  if (attempts.length < 2)
    throw new Error(`[v4-head-trace] combineAttempts needs at least 2 renders to prove determinism for "${route}", got ${attempts.length}`)
  const hashes = attempts.map(a => a.hash)
  const deterministic = hashes.every(h => h === hashes[0])
  if (!deterministic) {
    console.error(
      `[v4-head-trace] NON-DETERMINISTIC head on route "${route}": renders hashed [${hashes.join(', ')}]. `
      + `This route stays on the runtime head path.`,
    )
  }
  if (disqualifiers.length) {
    for (const d of disqualifiers)
      console.error(`[v4-head-trace] route "${route}" disqualified from runtime omission: ${d}`)
  }
  const runtimeOmittable = deterministic && disqualifiers.length === 0
  const first = attempts[0]!
  return {
    route,
    deterministic,
    classification: first.recorded.kind,
    reason: first.recorded.kind === 'dynamic' ? first.recorded.reason : undefined,
    disqualifiers,
    runtimeOmittable,
    hashes,
    payload: runtimeOmittable ? first.recorded.payload : undefined,
  }
}
