import { describe, expect, it } from 'vitest'
import { compileTags, dynamicValue } from '../../../src/compiled/compile'
import { createHead, createServerRenderer, renderSSRHead, templateParams } from '../../../src/compiled/server-strict'
import { TemplateParamsPlugin } from '../../../src/plugins'
import { createHead as createV3Head, renderSSRHead as renderV3 } from '../../../src/server'
import { corpus } from './corpus'
import { attempt, renderScenarioV3 } from './util'

function compileOrSkip(input: any) {
  const result = compileTags(input)
  return result._tag === 'Ok' ? result.tags : undefined
}

function strictScenarios() {
  return corpus.filter(({ entries, head }) => {
    return entries.every(e => !e.options && compileOrSkip(e.input) && (e.patch === undefined || compileOrSkip(e.patch)))
      && (head?.init || []).every(input => !input || compileOrSkip(input))
  })
}

describe('strict head equals v3', () => {
  describe.each([['without template params', false], ['with template params', true]])('%s', (_, tp) => {
    it.each(strictScenarios().map(s => [s.name, s] as const))('%s', (_name, scenario) => {
      const head = createHead({
        disableDefaults: true,
        ...scenario.head as any,
        init: scenario.head?.init?.map(input => input && compileOrSkip(input)) as any,
        plugins: tp ? [templateParams] : [],
      })
      for (const { input, dispose, patch } of scenario.entries) {
        const entry = head.push(compileOrSkip(input)!)
        if (dispose)
          entry.dispose()
        if (patch !== undefined)
          entry.patch(compileOrSkip(patch)!)
      }
      const expected: any = renderScenarioV3(scenario, tp)
      const actual = attempt(() => ({ first: renderSSRHead(head, scenario.render), again: renderSSRHead(head, scenario.render), method: head.render() }))
      expect(actual).toEqual('threw' in expected ? expected : { value: { first: expected.value.first, again: expected.value.again, method: expected.value.method } })
    })
  })

  it('covers most of the corpus', () => {
    // the Nuxt renderer scenarios push the payload with entry options, which a strict head refuses
    expect(strictScenarios().length).toBeGreaterThan(corpus.length - 12)
  })
})

describe('strict head values', () => {
  it('renders dynamic values through the v3 rules', () => {
    const result = compileTags({ title: dynamicValue(0), titleTemplate: '%s %separator %siteName', meta: [{ name: 'd', content: dynamicValue(1) }], templateParams: { siteName: 'S' } }, { dynamicValues: 2 })
    const compiledTags = result._tag === 'Ok' ? result.tags : []
    for (const [title, description] of [['a', 'b'], ['"<x>"', ''], ['%siteName', '%s'], [5, 0]]) {
      const v3 = createV3Head({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
      v3.push({ title, titleTemplate: '%s %separator %siteName', meta: [{ name: 'd', content: description }], templateParams: { siteName: 'S' } })
      const head = createHead({ disableDefaults: true, plugins: [templateParams] })
      head.push(compiledTags, { values: [title, description] } as any)
      expect(renderSSRHead(head)).toEqual(renderV3(v3))
      expect(renderSSRHead(head)).toEqual(renderV3(v3))
    }
  })

  it('patches compiled tags and their values', () => {
    const result = compileTags({ title: dynamicValue(0) }, { dynamicValues: 1 })
    const compiledTags = result._tag === 'Ok' ? result.tags : []
    const head = createHead({ disableDefaults: true })
    const entry = head.push(compiledTags, { values: ['one'] } as any)
    expect(renderSSRHead(head).headTags).toBe('<title>one</title>')
    ;(entry.patch as any)(compiledTags, { values: ['two'] })
    expect(renderSSRHead(head).headTags).toBe('<title>two</title>')
  })
})

describe('strict head refuses what it cannot render', () => {
  const compiledTags = compileOrSkip({ title: 'a' })!

  it('loose input', () => {
    const head = createHead()
    expect(() => head.push({ title: 'a' } as any)).toThrow('[unhead] A strict head renders compiled tags only')
    expect(() => head.push(compiledTags).patch({ title: 'b' } as any)).toThrow('loose input')
    expect(() => createHead({ init: [{ title: 'a' } as any] })).toThrow('loose input')
  })

  it('hooks and every option that needs them', () => {
    expect(() => createHead().hooks).toThrow('For hooks')
    expect(() => createHead({ hooks: {} } as any)).toThrow('For hooks')
    expect(() => createHead({ tagWeight: () => 1 } as any)).toThrow('tagWeight')
    expect(() => createHead({ propResolvers: [(v: unknown) => v] } as any)).toThrow('propResolvers')
  })

  it('plugins, including the hook based template params plugin', () => {
    expect(() => createHead({ plugins: [TemplateParamsPlugin as any] })).toThrow('templateParams export')
    expect(() => createHead({ plugins: [{ key: 'x', hooks: {} } as any] })).toThrow('templateParams export')
    expect(() => createHead().use({ key: 'x' })).toThrow('templateParams export')
  })

  it('entry options', () => {
    expect(() => createHead().push(compiledTags, { tagPosition: 'bodyClose' })).toThrow('entry options')
  })

  it('values v3 rules would have to decide', () => {
    const result = compileTags({ title: dynamicValue(0) }, { dynamicValues: 1 })
    const head = createHead({ disableDefaults: true })
    head.push(result._tag === 'Ok' ? result.tags : [], { values: [null] } as any)
    expect(() => renderSSRHead(head)).toThrow('non-text values')
  })
})

describe('strict entry points', () => {
  it('renders through head.render and createServerRenderer', () => {
    const head = createHead({ disableDefaults: true, omitLineBreaks: true })
    head.push(compileOrSkip({ title: 'a', meta: [{ name: 'x', content: 'y' }] })!)
    expect(head.render().headTags).toBe('<title>a</title><meta name="x" content="y">')
    expect(createServerRenderer()(head).headTags).toBe('<title>a</title>\n<meta name="x" content="y">')
  })

  it('renders the default compiled tags like v3', () => {
    expect(renderSSRHead(createHead())).toEqual(renderV3(createV3Head()))
  })
})
