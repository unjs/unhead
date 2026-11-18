import { describe, expect, it } from 'vitest'
import { compileTags, dynamicValue } from '../../../src/compiled'
import { createHead, renderSSRHead } from '../../../src/compiled/server'
import { resolveDynamicValues } from '../../../src/compiled/tags'
import { TemplateParamsPlugin } from '../../../src/plugins'
import { createHead as createV3Head, renderSSRHead as renderV3 } from '../../../src/server'
import { headState } from './util'

// the input v3 gets when the author writes each value in place
function applyValues(value: unknown, values: unknown[]): unknown {
  if (typeof value === 'string')
    return resolveDynamicValues(value, values)
  if (Array.isArray(value))
    return value.map(item => applyValues(item, values))
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, applyValues(item, values)]))
  return value
}

// The title state a render leaves on the head, for a title value that may or may not
// reach the HTML. Each head renders twice, and later heads hit the memo.
function compare(template: Record<string, unknown>, valuesList: unknown[][], tp: boolean) {
  const result = compileTags(template, { dynamicValues: valuesList[0]!.length })
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  const compiledTags = [...result.tags]
  for (const values of [...valuesList, ...valuesList]) {
    const plugins = tp ? [TemplateParamsPlugin] : []
    const v3 = createV3Head({ disableDefaults: true, plugins })
    v3.push(applyValues(template, values) as any)
    const head = createHead({ disableDefaults: true, plugins })
    head.push(compiledTags, { values })
    for (let i = 0; i < 2; i++) {
      const expected = { html: renderV3(v3), state: headState(v3) }
      expect({ html: renderSSRHead(head), state: headState(head) }, JSON.stringify(values)).toEqual(expected)
    }
  }
}

describe.each([['without template params', false], ['with template params', true]])('title value state %s', (_, tp) => {
  it('holds the value when a title template hides the title', () => {
    compare({ title: dynamicValue(0), titleTemplate: 'Acme' }, [['Order #123'], ['Order #456']], tp)
  })

  it('holds the value inside a longer title the template hides', () => {
    compare({ title: `Order ${dynamicValue(0)}`, titleTemplate: 'Acme' }, [['#123'], ['#456']], tp)
  })

  it('keeps a number value a number', () => {
    compare({ title: dynamicValue(0) }, [[123], [456]], tp)
    compare({ title: dynamicValue(0), titleTemplate: 'Acme' }, [[123], [456]], tp)
    compare({ title: dynamicValue(0), titleTemplate: '%s | Acme' }, [[7], [8]], tp)
  })

  it('takes v3 rules for a value v3 may treat differently', () => {
    compare({ title: dynamicValue(0), titleTemplate: 'Acme' }, [[null], [''], [0], [false], ['true'], ['a%b'], [' pad '], ['$&'], [{ a: 1 }], ['ok']], tp)
  })
})

describe('a title value read through %pageTitle', () => {
  it('renders like v3 in the same render', () => {
    const template = {
      title: dynamicValue(0),
      titleTemplate: 'Acme',
      meta: [{ name: 'description', content: 'Read %pageTitle' }, { property: 'og:title', content: '%pageTitle' }],
    }
    compare(template, [['Order #123'], ['Order "4" <5>'], [42], [' pad']], true)
  })
})
