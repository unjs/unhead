import { describe, expect, it } from 'vitest'
import { compileTags, dynamicValue } from '../../../src/compiled/compile'
import { DEFAULT_COMPILED_TAGS } from '../../../src/compiled/core'
import { toHeadInput } from '../../../src/compiled/tags'

function expectBail(input: unknown, dynamicValues?: number) {
  const result = compileTags(input, { dynamicValues })
  expect(result._tag).toBe('Bail')
}

describe('compileTags', () => {
  it('builds tuples with v3 weight, identity, and flags', () => {
    const result = compileTags({
      title: 'a',
      meta: [{ property: 'og:image', content: '/a.png' }, { name: 'description', content: 'b' }],
      script: [{ src: '/a.js', defer: true, tagPriority: 'low', key: 'k' }],
      link: [{ rel: 'icon', href: '/i' }],
      htmlAttrs: { class: 'x y', style: { color: 'red', margin: '0' } },
    })
    expect(result).toEqual({
      _tag: 'Ok',
      valueCount: 0,
      tags: [
        ['title', 0, 10, 'title', { textContent: 'a' }, 1],
        ['meta', { property: 'og:image', content: '/a.png' }, 100, 'meta:og:image', 0, 3],
        ['meta', { name: 'description', content: 'b' }, 100, 'meta:description', 0, 1],
        ['script', { 'src': '/a.js', 'defer': true, 'data-hid': 'k' }, 82, 'script:key:k', { tagPriority: 'low', key: 'k' }, 1],
        ['link', { rel: 'icon', href: '/i' }, 100, 'link:icon:/i', 0, 1],
        ['htmlAttrs', { class: 'x y', style: 'color:red;margin:0' }, 100, 'htmlAttrs', 0, 1],
      ],
    })
  })

  it('marks a hash identity', () => {
    const result = compileTags({ script: [{ src: '/a.js' }] })
    expect(result._tag === 'Ok' && result.tags[0]).toEqual(['script', { src: '/a.js' }, 50, 'script:src:/a.js'])
  })

  it('compiles the default init to the shipped compiled tags', () => {
    const result = compileTags({
      htmlAttrs: { lang: 'en' },
      meta: [{ charset: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    })
    expect(result._tag === 'Ok' && result.tags).toEqual(DEFAULT_COMPILED_TAGS)
  })

  it('drops an inert tag and keeps a tag that shadows another', () => {
    const result = compileTags({ meta: [{}, { 'data-x': 'y' }, { name: 'description', content: '' }], title: '' })
    expect(result._tag === 'Ok' && result.tags.map(tag => tag[0])).toEqual(['meta', 'title'])
    expect(result._tag === 'Ok' && result.tags[0]![3]).toBe('meta:description')
  })

  it('returns a bail value and never throws', () => {
    expectBail(undefined)
    expectBail(null)
    expectBail('title')
    expectBail([])
    expectBail({ title: () => 'a' })
    expectBail({ titleTemplate: (t: string) => t })
    expectBail({ title: Promise.resolve('a') })
    expectBail({ meta: [{ name: 'a', content: new Date(0) }] })
    expectBail({ meta: [{ name: 'a', content: Number.NaN }] })
    expectBail({ meta: [{ name: 'a', content: 1n }] })
    expectBail({ meta: [{ name: 'a', content: Symbol('s') }] })
    expectBail({ script: [{ src: '/a.js', onload: () => {} }] })
    expectBail({ script: [{ src: '/a.js', onload: 'x()' }] })
    expectBail({ link: [{ rel: 'x', foo: ['a'] }] })
    expectBail({ link: [{ rel: 'x', class: null }] })
    expectBail({ unknown: { a: 'b' } })
    expectBail({ _flatMeta: { description: 'a' } })
    expectBail({ title: { 'textContent': 'a', 'x"y': 'z' } })
    expectBail({ templateParams: { class: 'a' } })
    expectBail({ titleTemplate: 5 })
    const cycle: any = {}
    cycle.self = cycle
    expectBail({ templateParams: cycle })
    expectBail({
      get title() {
        throw new Error('boom')
      },
    })
    expectBail({ meta: Array.from({ length: 1024 }, (_, i) => ({ name: `m${i}`, content: 'c' })) })
  })

  // The fast tiers skip the hooks of these plugins for compiled entries, so compiled tags must hold
  // nothing they would change.
  it('refuses input that a built-in plugin rewrites', () => {
    // DeprecationsPlugin, in entries:normalize
    for (const key of ['hid', 'vmid', 'children', 'body']) {
      expectBail({ script: [{ src: '/a.js', [key]: 'x' }] })
      expectBail({ templateParams: { [key]: 'x' } })
    }
    expectBail({ script: [{ src: '/a.js', body: false }] })
    expectBail({ script: [{ src: '/a.js', body: null }] })
    expectBail({ title: { textContent: 'a', renderPriority: 1 } })
    expectBail({ titleTemplate: { textContent: '%s', renderPriority: 1 } })
    expectBail({ htmlAttrs: { hid: 'x' } })
    // AliasSortingPlugin, in tags:resolve
    expectBail({ script: [{ src: '/a.js', tagPriority: 'before:script:b' }] })
    expectBail({ link: [{ rel: 'x', href: '/a', tagPriority: 'after:link:b' }] })
    expectBail({ title: { textContent: 'a', tagPriority: 'before:meta:x' } })
    // PromisesPlugin, in entries:resolve
    expectBail({ title: Promise.resolve('a') })
    expectBail({ meta: [{ name: 'a', content: Promise.resolve('b') }] })
    expectBail({ meta: [Promise.resolve({ name: 'a', content: 'b' })] })
    expectBail({ templateParams: { a: Promise.resolve('b') } })
    expectBail({ meta: [{ name: 'a', content: { then: () => {} } }] })
  })

  it('keeps input that a built-in plugin leaves alone', () => {
    // an element tag lowercases the name, so DeprecationsPlugin never reads it
    for (const input of [
      { link: [{ rel: 'x', href: '/a', renderPriority: 1 }] },
      { script: [{ src: '/a.js', tagPriority: 'high' }] },
      { meta: [{ name: 'description', content: 'before: and after: are text here' }] },
    ])
      expect(compileTags(input)._tag).toBe('Ok')
  })

  it('refuses private-use tokens that are not declared dynamic values', () => {
    expectBail({ title: dynamicValue(0) })
    expectBail({ title: dynamicValue(1) }, 1)
    expectBail({ title: '\uE000' }, 1)
    expectBail({ title: '\uE001' }, 1)
    expectBail({ meta: [{ [dynamicValue(0)]: 'a', name: 'b', content: 'c' }] }, 1)
  })

  it('refuses dynamic values in identity and weight', () => {
    const h = dynamicValue(0)
    expectBail({ meta: [{ name: h, content: 'a' }] }, 1)
    expectBail({ meta: [{ property: h, content: 'a' }] }, 1)
    expectBail({ meta: [{ 'http-equiv': h, 'content': 'a' }] }, 1)
    expectBail({ meta: [{ charset: h }] }, 1)
    expectBail({ meta: [{ content: h }] }, 1)
    expectBail({ link: [{ rel: h, href: '/a', key: 'k' }] }, 1)
    expectBail({ link: [{ rel: 'x', href: '/a', key: 'k', hreflang: h }] }, 1)
    expectBail({ link: [{ rel: 'x', href: '/a', key: 'k', as: h }] }, 1)
    expectBail({ link: [{ rel: 'x', href: '/a', key: 'k', type: h }] }, 1)
    expectBail({ link: [{ rel: 'x', href: h }] }, 1)
    expectBail({ script: [{ key: 'k', type: h }] }, 1)
    expectBail({ script: [{ key: 'k', src: h }] }, 1)
    expectBail({ script: [{ key: 'k', async: h }] }, 1)
    expectBail({ script: [{ key: 'k', defer: h }] }, 1)
    expectBail({ script: [{ id: h, src: '/a' }] }, 1)
    expectBail({ script: [{ src: h }] }, 1)
    expectBail({ script: [{ innerHTML: h }] }, 1)
    expectBail({ style: [{ key: 'k', media: h, innerHTML: 'a{}' }] }, 1)
    expectBail({ style: [{ innerHTML: h }] }, 1)
    expectBail({ link: [{ rel: 'x', href: '/a', key: h }] }, 1)
    expectBail({ link: [{ rel: 'x', href: '/a', id: h }] }, 1)
    expectBail({ title: { textContent: 'a', tagPriority: h } }, 1)
    expectBail({ title: { textContent: 'a', tagPosition: h } }, 1)
    expectBail({ title: { textContent: 'a', tagDuplicateStrategy: h } }, 1)
    expectBail({ title: { textContent: 'a', processTemplateParams: h } }, 1)
    // a value could finish these into the text that v3 coerces to a boolean attribute
    expectBail({ link: [{ rel: 'x', key: 'k', href: `tr${h}` }] }, 1)
    expectBail({ link: [{ rel: 'x', key: 'k', href: `${h}${dynamicValue(1)}` }] }, 2)
    expectBail({ htmlAttrs: { class: h } }, 1)
    expectBail({ htmlAttrs: { style: h } }, 1)
    expectBail({ titleTemplate: h }, 1)
    expectBail({ templateParams: { a: h } }, 1)
  })

  // Nuxt UI sets its color variables this way
  it('compiles a dynamic value in the content of a style with a fixed identity', () => {
    const result = compileTags({ style: [{ innerHTML: dynamicValue(0), tagPriority: 'critical', id: 'colors' }] }, { dynamicValues: 1 })
    expect(result._tag).toBe('Ok')
  })

  it('refuses a dynamic value a non-string value would normalize differently', () => {
    const h = dynamicValue(0)
    // a value array would expand here in the compiled tags but not in the input
    expectBail({ meta: [{ property: 'og:image', content: [h, 'b'] }] }, 1)
    // a null value means another tag in the shorthand form
    expectBail({ title: { textContent: h } }, 1)
    expectBail({ script: [h] }, 1)
    expectBail({ noscript: h }, 1)
    expectBail({ script: [{ key: 'k', type: 'application/json', innerHTML: { a: h } }] }, 1)
  })

  it('accepts dynamic values where a value cannot change a decision', () => {
    const h = dynamicValue(0)
    for (const input of [
      { title: h },
      { title: `a ${h} b` },
      { meta: [{ name: 'a', content: h }] },
      { link: [{ rel: 'preload', key: 'k', href: h }] },
      { script: [{ key: 'k', innerHTML: h }] },
      { htmlAttrs: { lang: h } },
      { base: { href: h } },
    ]) {
      const result = compileTags(input, { dynamicValues: 1 })
      expect(result).toMatchObject({ _tag: 'Ok', valueCount: 1 })
      expect(result._tag === 'Ok' && result.tags[0]![5]! & 4).toBe(4)
    }
  })
})

describe('toHeadInput', () => {
  it('rebuilds a v3 shaped input', () => {
    const input = {
      title: 'a',
      titleTemplate: '%s b',
      templateParams: { site: { name: 'n' }, separator: '-' },
      meta: [{ name: 'c', content: 'd', tagPosition: 'bodyClose' }, { name: 'e', content: 'f' }],
      link: [{ rel: 'icon', href: '/i' }],
      script: [{ src: '/a.js', async: true }, { key: 'k', innerHTML: 'x()' }],
      htmlAttrs: { lang: 'en', class: 'x y' },
    }
    const result = compileTags(input)
    expect(result._tag === 'Ok' && toHeadInput(result.tags)).toEqual(input)
  })

  it('substitutes values, keeping the raw value of a whole dynamic value', () => {
    const result = compileTags({ title: `x ${dynamicValue(0)}`, meta: [{ name: 'a', content: dynamicValue(1) }] }, { dynamicValues: 2 })
    expect(result._tag === 'Ok' && toHeadInput(result.tags, ['t', null])).toEqual({ title: 'x t', meta: [{ name: 'a', content: null }] })
  })
})
