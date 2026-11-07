import { describe, expect, it } from 'vitest'
import { compileTags } from '../../../src/compiled/compile'
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
  ])

  it('compiles every scenario input it should', () => {
    const bailed = new Set<string>()
    for (const scenario of corpus) {
      const inputs = [...scenario.entries.flatMap(e => e.patch === undefined ? [e.input] : [e.input, e.patch]), ...(scenario.head?.init || [])]
      for (const input of inputs) {
        if (input && compileTags(input)._tag === 'Bail')
          bailed.add(scenario.name)
      }
    }
    expect([...bailed].filter(name => !expectedBails.has(name))).toEqual([])
  })
})
