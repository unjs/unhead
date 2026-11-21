import { describe, expect, it } from 'vitest'
import { compileTags, createHead, dynamicValue, renderSSRHead } from '../../../src/compiled/server'
import { createHead as createV3Head, renderSSRHead as renderV3 } from '../../../src/server'

// a keyless JSON-LD script whose content is a value, as `innerHTML: JSON.stringify(...)` compiles
const template = (type = 'application/ld+json') => ({ script: [{ type, innerHTML: dynamicValue(0) }] })
const input = (value: unknown, type = 'application/ld+json') => ({ script: [{ type, innerHTML: value }] })

function compiled(source: any, valueCount = 1) {
  const result = compileTags(source, { valueCount })
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  // a fresh array per call, so one test cannot reach another through the memo
  return [...result.tags]
}

describe('a keyless JSON script with a value as its content', () => {
  it.each(['application/ld+json', 'application/json', 'importmap', 'speculationrules'])('compiles for type %s', (type) => {
    expect(compileTags(template(type), { valueCount: 1 })._tag).toBe('Ok')
  })

  it.each([
    ['an inline script', { script: [{ innerHTML: dynamicValue(0) }] }],
    ['a style', { style: [{ innerHTML: dynamicValue(0) }] }],
    ['a noscript', { noscript: [{ textContent: dynamicValue(0) }] }],
  ])('still bails for %s, whose weight or identity the value decides', (_, source) => {
    expect(compileTags(source, { valueCount: 1 })).toMatchObject({ _tag: 'Err', reason: expect.stringContaining('identity') })
  })

  it('serves the head from the memo', () => {
    const tags = compiled(template())
    const render = (value: string) => {
      const head = createHead({ disableDefaults: true })
      head.push(tags, { values: [value] })
      return renderSSRHead(head).headTags
    }
    expect(render('{"a":1}')).toBe('<script type="application/ld+json">{"a":1}</script>')
    // only a memo can still return the old shape after the compiled tags changed
    ;(tags[0] as any)[1] = { type: 'application/ld+json', id: 'changed' }
    expect(render('{"a":2}')).toBe('<script type="application/ld+json">{"a":2}</script>')
  })

  // v3 dedupes two keyless scripts with the same content to one
  it.each([
    ['two scripts with other values', ['{"a":1}', '{"a":2}'], [input('{"a":1}'), input('{"a":2}')]],
    ['two scripts with the same value', ['{"a":1}', '{"a":1}'], [input('{"a":1}'), input('{"a":1}')]],
    ['a number value', [1, 2], [input(1), input(2)]],
    ['a value with a closing tag', ['{"a":"</script>"}', '{"b":1}'], [input('{"a":"</script>"}'), input('{"b":1}')]],
    ['an empty value', ['', '{"b":1}'], [input(''), input('{"b":1}')]],
    ['an object value', [{ a: 1 }, '{"b":1}'], [input({ a: 1 }), input('{"b":1}')]],
  ])('renders like v3: %s', (_, values, v3Input) => {
    const tags = compiled(template())
    for (let i = 0; i < 3; i++) {
      const head = createHead()
      head.push(tags, { values: [values[0]] })
      head.push(tags, { values: [values[1]] })
      const v3 = createV3Head()
      v3Input.forEach(entry => v3.push(entry as any))
      expect(renderSSRHead(head)).toEqual(renderV3(v3))
    }
  })

  it('renders like v3 when the value equals a static script of the head', () => {
    const tags = compiled(template())
    const staticScript = compiled(input('{"s":1}'), 0)
    for (const value of ['{"s":1}', '{"t":1}', '{"s":1}']) {
      const head = createHead()
      head.push(staticScript)
      head.push(tags, { values: [value] })
      const v3 = createV3Head()
      v3.push(input('{"s":1}') as any)
      v3.push(input(value) as any)
      expect(renderSSRHead(head)).toEqual(renderV3(v3))
    }
  })

  it('renders like v3 next to a meta tag with the same text', () => {
    const tags = compiled({ meta: [{ name: 'description', content: 'x' }], script: [{ type: 'application/ld+json', textContent: `{"d":"${dynamicValue(0)}"}` }] })
    for (const value of ['a', 'b"c', 'a']) {
      const head = createHead()
      head.push(tags, { values: [value] })
      const v3 = createV3Head()
      v3.push({ meta: [{ name: 'description', content: 'x' }], script: [{ type: 'application/ld+json', textContent: `{"d":"${value}"}` }] } as any)
      expect(renderSSRHead(head)).toEqual(renderV3(v3))
    }
  })
})
