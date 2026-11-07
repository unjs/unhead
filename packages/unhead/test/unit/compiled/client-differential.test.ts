import type { Params } from './client-util'
import { describe, expect, it, vi } from 'vitest'
import { applyScenario, createPair, isCompiled, serverEntries } from './client-util'
import { corpus } from './corpus'

const v3Runtime = vi.hoisted(() => ({ heads: new Set<unknown>() }))
vi.mock('../../../src/lazy/runtime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/lazy/runtime')>()
  return {
    ...actual,
    upgradeHead: (...args: Parameters<typeof actual.upgradeHead>) => {
      v3Runtime.heads.add(args[0])
      return actual.upgradeHead(...args)
    },
  }
})

const PARAMS: Params[] = ['none', 'plugin', 'lazy']

function serverOptions(scenario: (typeof corpus)[number]) {
  return { disableDefaults: scenario.head?.disableDefaults ?? true }
}

function fullyCompiled(scenario: (typeof corpus)[number]) {
  return serverEntries(scenario).every((e: { input: unknown, patch?: unknown }) => isCompiled(e.input) && (e.patch === undefined || isCompiled(e.patch)))
}

const cases = corpus.map(scenario => [scenario.name, scenario] as const)

describe.each(PARAMS)('compiled runtime equals the v3 client head, template params %s', (params) => {
  it.each(cases)('hydration then disposal and a fresh push: %s', async (_, scenario) => {
    const pair = createPair(serverEntries(scenario), params, serverOptions(scenario))
    const entries = applyScenario(pair, scenario)
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
    if (fullyCompiled(scenario))
      expect(v3Runtime.heads.has(pair.compiled)).toBe(false)

    for (const entry of entries.reverse()) {
      entry.dispose()
      await pair.render()
      expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
    }
    applyScenario(pair, scenario)
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
  })

  it.each(cases)('a change before load leaves no stale server element: %s', async (_, scenario) => {
    const pair = createPair(serverEntries(scenario), params, serverOptions(scenario))
    const entries = applyScenario(pair, scenario)
    pair.v3.render()
    pair.compiled.render()
    pair.compiled.blockLoad()
    entries[0]?.dispose()
    entries.at(-1)?.patch({ title: 'changed', meta: [{ name: 'description', content: 'changed' }] })
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
  })
})
