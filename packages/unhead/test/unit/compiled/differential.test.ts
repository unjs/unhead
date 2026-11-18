import { describe, expect, it } from 'vitest'
import { compileTags } from '../../../src/compiled'
import { corpus } from './corpus'
import { MODES, renderScenarioCompiled, renderScenarioV3, resolveScenarioCompiled, resolveScenarioV3 } from './util'

describe.each([
  ['without template params', false],
  ['with template params', true],
])('compiled head equals v3, %s', (_, tp) => {
  describe.each(MODES)('%s', (mode) => {
    it.each(corpus.map(scenario => [scenario.name, scenario] as const))('%s', (_name, scenario) => {
      expect(renderScenarioCompiled(scenario, tp, mode)).toEqual(renderScenarioV3(scenario, tp))
    })
  })
})

describe('the full runtime tier with a tags:resolve listener equals v3', () => {
  describe.each(MODES)('%s', (mode) => {
    it.each(corpus.map(scenario => [scenario.name, scenario] as const))('%s', (_name, scenario) => {
      for (const tp of [false, true]) {
        const seenV3: unknown[] = []
        const seen: unknown[] = []
        expect(renderScenarioCompiled(scenario, tp, mode, seen)).toEqual(renderScenarioV3(scenario, tp, seenV3))
        expect(seen).toEqual(seenV3)
      }
    })
  })
})

describe('resolveTags over the compiled head equals v3', () => {
  describe.each(MODES)('%s', (mode) => {
    it.each(corpus.map(scenario => [scenario.name, scenario] as const))('%s', (_name, scenario) => {
      expect(resolveScenarioCompiled(scenario, true, mode)).toEqual(resolveScenarioV3(scenario, true))
      expect(resolveScenarioCompiled(scenario, false, mode)).toEqual(resolveScenarioV3(scenario, false))
    })
  })
})

describe('corpus compiled tags coverage', () => {
  // A scenario that bails only proves the loose path, so keep this list honest.
  const expectedBails = new Set([
    'normalize: unknown tag dropped',
    // the top-level `charset` and `viewport` keys of a built Nuxt app head
    'nuxt: app head as built',
    'nuxt: renderer pushes, main, payload 0',
    'nuxt: renderer pushes, main, payload 1',
    'nuxt: renderer pushes, main, payload 2',
    'nuxt: renderer pushes, main, payload 3',
    'nuxt: renderer pushes, 4.6.4, payload extraction',
    // the value holds a private-use character, so only the template compiles
    'nuxt: renderer compiled tags, payload value 2',
    // AliasSortingPlugin moves this tag, and the fast tiers never run it on compiled tags
    'priority: alias strategy string',
  ])

  it('compiles every scenario input it should', () => {
    const bailed = new Set<string>()
    for (const scenario of corpus) {
      const inputs = [...scenario.entries.flatMap(e => e.patch === undefined ? [e.input] : [e.input, e.patch]), ...(scenario.head?.init || [])]
      for (const input of inputs) {
        if (input && compileTags(input)._tag === 'Bail')
          bailed.add(scenario.name)
      }
      for (const { template, values } of scenario.entries) {
        if (template && compileTags(template, { dynamicValues: values!.length })._tag === 'Bail')
          bailed.add(scenario.name)
      }
    }
    expect([...bailed].filter(name => !expectedBails.has(name))).toEqual([])
  })
})
