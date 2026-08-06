/**
 * The five page-switch architectures under test, plus v3 references.
 * Each factory mounts route 0 synchronously and returns nav(i): perform a
 * full navigation to route i with exactly one flush.
 */
import type { Scenario } from './routes'
import { createHead as createV3 } from '../../../packages/unhead/src/client'
import { createHead as createStockV4 } from '../../../packages/unhead/src/v4/client'
import { compileEntry } from '../../../packages/unhead/src/v4/compile'
import { createHead as createPlanHead } from './client-plan'
import { createSwapCore } from './core-swap'

export interface NavController {
  nav: (i: number) => void
  head: any
}

export type StrategyFactory = (doc: Document, sc: Scenario) => NavController

function noopScheduler() {}

/** 1. BASELINE: dispose route A's entries, push route B's, one flush. */
const disposePush: StrategyFactory = (doc, sc) => {
  const head = createStockV4({ document: doc, scheduler: noopScheduler })
  for (const [input, opts] of sc.looseStatic) head.push(input, opts)
  let handles = sc.looseDynamic(sc.routes[0]).map(([input, opts]) => head.push(input, opts))
  head.render()
  return {
    head,
    nav(i) {
      for (const h of handles) h.dispose()
      handles = sc.looseDynamic(sc.routes[i]).map(([input, opts]) => head.push(input, opts))
      head.render()
    },
  }
}

/** 2. ENTRY PATCH: one long-lived entry per concern, patch with route B input. */
const entryPatch: StrategyFactory = (doc, sc) => {
  const head = createStockV4({ document: doc, scheduler: noopScheduler })
  for (const [input, opts] of sc.looseStatic) head.push(input, opts)
  const handles = sc.looseDynamic(sc.routes[0]).map(([input, opts]) => head.push(input, opts))
  head.render()
  return {
    head,
    nav(i) {
      const inputs = sc.looseDynamic(sc.routes[i])
      for (let j = 0; j < handles.length; j++) handles[j].patch(inputs[j][0])
      head.render()
    },
  }
}

/** 3. SEALED PLAN SWAP: per-route sealed plan consts; dispose A's plan entry, push B's. */
const planSwap: StrategyFactory = (doc, sc) => {
  const head = createPlanHead({ document: doc, scheduler: noopScheduler })
  const plans = sc.routes.map(() => sc.freshRoutePlan())
  head.push(sc.planStatic)
  let handle = head.push(plans[0], { fills: sc.fills(sc.routes[0]) })
  head.render()
  return {
    head,
    nav(i) {
      handle.dispose()
      handle = head.push(plans[i], { fills: sc.fills(sc.routes[i]) })
      head.render()
    },
  }
}

/** 4a. SWAP PRIMITIVE over loose input: head.swap replaces the route group atomically. */
const swapLoose: StrategyFactory = (doc, sc) => {
  const core = createSwapCore({ ssr: false, compile: compileEntry })
  const head = createPlanHead({ document: doc, scheduler: noopScheduler, core })
  for (const [input, opts] of sc.looseStatic) head.push(input, opts)
  head.swap!('route', sc.looseDynamic(sc.routes[0]) as [unknown, any][])
  head.render()
  return {
    head,
    nav(i) {
      head.swap!('route', sc.looseDynamic(sc.routes[i]) as [unknown, any][])
      head.render()
    },
  }
}

/** 4b. SWAP PRIMITIVE over sealed plans. */
const swapPlan: StrategyFactory = (doc, sc) => {
  const core = createSwapCore({ ssr: false, compile: compileEntry })
  const head = createPlanHead({ document: doc, scheduler: noopScheduler, core })
  const plans = sc.routes.map(() => sc.freshRoutePlan())
  head.push(sc.planStatic)
  head.swap!('route', [[plans[0], { fills: sc.fills(sc.routes[0]) }]])
  head.render()
  return {
    head,
    nav(i) {
      head.swap!('route', [[plans[i], { fills: sc.fills(sc.routes[i]) }]])
      head.render()
    },
  }
}

/** 5. FILLS-ONLY REFILL: one shared plan shape, navigation changes only the fills. */
const fillsOnly: StrategyFactory = (doc, sc) => {
  const head = createPlanHead({ document: doc, scheduler: noopScheduler })
  head.push(sc.planStatic)
  const handle = head.push(sc.routePlan, { fills: sc.fills(sc.routes[0]) })
  head.render()
  return {
    head,
    nav(i) {
      handle.patch(sc.routePlan, sc.fills(sc.routes[i]))
      head.render()
    },
  }
}

export const strategies: Record<string, StrategyFactory> = {
  'dispose-push': disposePush,
  'entry-patch': entryPatch,
  'plan-swap': planSwap,
  'swap-loose': swapLoose,
  'swap-plan': swapPlan,
  'fills-only': fillsOnly,
}

// ---- v3 references (bench context only; not held to the v4 correctness gates)

const v3DisposePush: StrategyFactory = (doc, sc) => {
  const head = createV3({ document: doc }) as any
  for (const [input, opts] of sc.looseStatic) head.push(input, opts)
  let handles = sc.looseDynamic(sc.routes[0]).map(([input, opts]) => head.push(input, opts))
  head.render()
  return {
    head,
    nav(i) {
      for (const h of handles) h.dispose()
      handles = sc.looseDynamic(sc.routes[i]).map(([input, opts]) => head.push(input, opts))
      head.render()
    },
  }
}

const v3EntryPatch: StrategyFactory = (doc, sc) => {
  const head = createV3({ document: doc }) as any
  for (const [input, opts] of sc.looseStatic) head.push(input, opts)
  const handles = sc.looseDynamic(sc.routes[0]).map(([input, opts]) => head.push(input, opts))
  head.render()
  return {
    head,
    nav(i) {
      const inputs = sc.looseDynamic(sc.routes[i])
      for (let j = 0; j < handles.length; j++) handles[j].patch(inputs[j][0])
      head.render()
    },
  }
}

export const v3Strategies: Record<string, StrategyFactory> = {
  'v3-dispose-push': v3DisposePush,
  'v3-entry-patch': v3EntryPatch,
}
