/** @experimental v4 preview surface: semver-exempt until v4 stabilizes. See packages/unhead/V4_DESIGN.md. */
/**
 * Prerender route recording: after a deterministic (prerendered) route
 * renders, capture the final head payload and classify whether it was
 * produced purely from sealed plans.
 *
 * `static` authorizes the integration to serve the payload as-is and, when
 * the route also has no client mutation or navigation sources, to omit the
 * client head runtime entirely. `dynamic` still carries the payload (it is
 * the rendered truth for this prerender pass) but the plan-reproducibility
 * guarantee does not hold, so the client head runtime must ship.
 */
import type { V4Head } from './core'
import type { SSRPayload } from './server'
import { renderSSRHead } from './server'

export type RecordedRouteHead
  = | { kind: 'static', payload: SSRPayload, entries: number }
    | { kind: 'dynamic', reason: string, payload: SSRPayload }

export function recordRouteHead(head: V4Head): RecordedRouteHead {
  const payload = renderSSRHead(head)
  // The strict sealed core (server-compiled/client-compiled) has no plugin
  // slots at all: `use()` throws, so `_pe`/`_pt`/`_pr` are `undefined` rather
  // than empty arrays. That is a stronger guarantee than "none registered
  // yet", not a weaker one, so optional-chaining here is not a silent
  // fallback: a head shape that structurally cannot host plugins correctly
  // never trips this branch.
  if (head._pe?.length || head._pt?.length || head._pr?.length)
    return { kind: 'dynamic', reason: 'runtime plugins are registered; the rendered head is not reproducible from plans alone', payload }
  let entries = 0
  for (const e of head.entries.values()) {
    entries++
    if (!Array.isArray(e.input))
      return { kind: 'dynamic', reason: `entry ${e.i} pushed loose input; the route head is not proven static`, payload }
  }
  return { kind: 'static', payload, entries }
}
