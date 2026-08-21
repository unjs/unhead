/**
 * Build-time module (runs in node, bundled by build.mjs): SSR-renders the
 * demo page head with the v3 and v4 server renderers and emits the sealed
 * route plan via emit.ts, exactly as the bundler transform would.
 */
import type { RouteState } from './entries'
import { createHead as createV3Head, renderSSRHead as renderV3 } from '../../../../packages/unhead/src/server'
import { emitRoutePlan, hole } from '../../../../packages/unhead/src/v4/emit'
import { createHead as createV4Head, renderSSRHead as renderV4 } from '../../../../packages/unhead/src/v4/server'
import { ENTRIES, ROUTES } from './entries'

export interface SSRResult {
  headTags: string
  bodyTags: string
  bodyTagsOpen: string
  htmlAttrs: string
  bodyAttrs: string
}

export function ssrV3(): SSRResult {
  const head = createV3Head()
  for (const [input, opts] of ENTRIES) head.push(input as any, opts)
  return renderV3(head)
}

export function ssrV4(): SSRResult {
  const head = createV4Head()
  for (const [input, opts] of ENTRIES) head.push(input, opts)
  return renderV4(head)
}

/**
 * Sealed route plan. Same entries as the runtime pages with two build-time
 * rewrites a compiler performs:
 * - titleTemplate is dropped and pre-applied into the title fill values
 *   (emitRoutePlan refuses a static template over a dynamic title by design)
 * - the 6 per-route values in the page entry become hole() markers
 */
export function emitSealed() {
  // hole creation order = input traversal order (all holes live in the page entry)
  const order: (keyof RouteState)[] = ['titleFull', 'desc', 'ogTitle', 'ogDesc', 'ogUrl', 'canonical']
  const pageEntry = {
    title: hole('text'),
    meta: [
      { name: 'description', content: hole('attr') },
      { property: 'og:title', content: hole('attr') },
      { property: 'og:description', content: hole('attr') },
      { property: 'og:url', content: hole('attr') },
    ],
    link: [{ rel: 'canonical', href: hole('attr') }],
  }
  const entries = ENTRIES.slice(0, 6).map(([input, opts], i) => {
    if (i === 4) {
      // site defaults minus titleTemplate (pre-applied into fills)
      const { titleTemplate: _, ...rest } = input
      return [rest, opts] as [Record<string, any>, Record<string, any> | undefined]
    }
    return [input, opts] as [Record<string, any>, Record<string, any> | undefined]
  })
  entries.push([pageEntry, undefined])

  const { plan, holes, fillOrder } = emitRoutePlan(entries as any)
  const fillsFor = (r: RouteState) => fillOrder.map(i => r[order[i]])
  return {
    plan,
    holes,
    fillOrder,
    fillsA: fillsFor(ROUTES.a),
    fillsB: fillsFor(ROUTES.b),
  }
}

export function ssrV4Sealed(plan: any[], fills: unknown[]): SSRResult {
  const head = createV4Head()
  head.push(plan, { fills })
  return renderV4(head)
}
