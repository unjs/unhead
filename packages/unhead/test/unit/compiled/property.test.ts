import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'
import { compileTags, dynamicValue } from '../../../src/compiled'
import { createHead as createCompiledHead, renderSSRHead as renderCompiled } from '../../../src/compiled/server'
import { toHeadInput } from '../../../src/compiled/tags'
import { TemplateParamsPlugin } from '../../../src/plugins'
import { createHead as createV3Head, renderSSRHead as renderV3 } from '../../../src/server'
import { dedupeKey, normalizeEntryToTags } from '../../../src/utils'
import { attempt, headState, toCompiledTags } from './util'

const text = fc.oneof(
  { weight: 3, arbitrary: fc.constantFrom('', 'a', 'b c', '%s', '%siteName', '%x', '%separator', '%separator a', '100%', '%20', '%E0%A4%A', '$&', '$1', '"q"', '\'s\'', '<x>', '</script>', '</style>', '</title>', '</noscript>', 'true', 'false', ' pad ', 'é', 'a:b;c:d') },
  { weight: 1, arbitrary: fc.string({ maxLength: 8 }) },
)
const attr = fc.oneof(text, fc.constantFrom(true, false, null, 0, 1, 1.5))
const config = {
  tagPriority: fc.constantFrom('high', 'low', 'critical', -5, 0, 55),
  tagPosition: fc.constantFrom('head', 'bodyClose', 'bodyOpen'),
  tagDuplicateStrategy: fc.constantFrom('merge', 'replace'),
  processTemplateParams: fc.boolean(),
  key: fc.constantFrom('k1', 'k2'),
}
const meta = fc.record({
  'name': fc.constantFrom('description', 'viewport', 'keywords', 'x', 'theme-color'),
  'property': fc.constantFrom('og:image', 'og:image:width', 'og:title', 'article:tag'),
  'http-equiv': fc.constantFrom('content-security-policy', 'refresh'),
  'charset': fc.constantFrom('utf-8', 'latin1'),
  'content': fc.oneof(attr, fc.array(text, { maxLength: 2 })),
  'data-x': attr,
  ...config,
}, { requiredKeys: [], noNullPrototype: true })
const link = fc.record({
  rel: fc.constantFrom('canonical', 'alternate', 'preload', 'stylesheet', 'preconnect', 'icon', 'modulepreload'),
  href: text,
  hreflang: fc.constantFrom('en', 'fr'),
  as: fc.constantFrom('script', 'style'),
  id: fc.constantFrom('i1', 'i2'),
  ...config,
}, { requiredKeys: [], noNullPrototype: true })
const script = fc.record({
  src: fc.constantFrom('/a.js', '/b.js'),
  async: fc.boolean(),
  defer: fc.boolean(),
  type: fc.constantFrom('module', 'application/json', 'application/ld+json', 'importmap', 'speculationrules', 'text/plain'),
  innerHTML: fc.oneof(text, fc.record({ a: text }, { requiredKeys: [], noNullPrototype: true })),
  textContent: text,
  id: fc.constantFrom('i1', 'i2'),
  ...config,
}, { requiredKeys: [], noNullPrototype: true })
const content = fc.oneof(text, fc.record({ innerHTML: text, ...config }, { requiredKeys: [], noNullPrototype: true }))
const classValue = fc.oneof(text, fc.array(text, { maxLength: 2 }), fc.record({ a: fc.boolean(), b: fc.boolean() }, { noNullPrototype: true }))
const styleValue = fc.oneof(fc.constantFrom('', 'a:b', 'a:b;c:d', 'color: red; a: b'), fc.record({ x: fc.constantFrom('y', 'z', false) }, { requiredKeys: [], noNullPrototype: true }))
const attrs = fc.record({
  'lang': text,
  'dir': fc.constantFrom('ltr', 'rtl'),
  'class': classValue,
  'style': styleValue,
  'data-a': attr,
  'tagDuplicateStrategy': config.tagDuplicateStrategy,
}, { requiredKeys: [], noNullPrototype: true })

const input = fc.record({
  title: fc.oneof(text, fc.constantFrom(null, 0, 5), fc.record({ textContent: text, tagPriority: config.tagPriority, processTemplateParams: config.processTemplateParams }, { requiredKeys: [], noNullPrototype: true })),
  titleTemplate: fc.oneof(fc.constantFrom('%s', '%s - b', '%s %separator %siteName', '[%s] %s', 'fixed', '', null), text),
  templateParams: fc.record({
    separator: fc.constantFrom('|', '-', ''),
    siteName: text,
    x: fc.oneof(text, fc.constantFrom(0, null, false)),
    pageTitle: text,
  }, { requiredKeys: [], noNullPrototype: true }),
  meta: fc.array(meta, { maxLength: 4 }),
  link: fc.array(link, { maxLength: 3 }),
  script: fc.array(script, { maxLength: 3 }),
  style: fc.array(content, { maxLength: 2 }),
  noscript: fc.array(content, { maxLength: 2 }),
  base: fc.record({ href: text, target: fc.constantFrom('_blank') }, { requiredKeys: [], noNullPrototype: true }),
  htmlAttrs: attrs,
  bodyAttrs: attrs,
}, { requiredKeys: [], noNullPrototype: true })

const scenario = fc.record({
  tp: fc.boolean(),
  omitLineBreaks: fc.boolean(),
  disableDefaults: fc.boolean(),
  entries: fc.array(fc.record({
    input,
    compiled: fc.boolean(),
    dispose: fc.boolean(),
    options: fc.option(fc.record({ tagPosition: config.tagPosition, tagPriority: config.tagPriority, processTemplateParams: config.processTemplateParams, tagDuplicateStrategy: config.tagDuplicateStrategy }, { requiredKeys: [], noNullPrototype: true }), { nil: undefined }),
  }), { maxLength: 4 }),
})

function plugins(tp: boolean) {
  return tp ? [TemplateParamsPlugin] : []
}

function renderV3Scenario(s: any) {
  const head = createV3Head({ disableDefaults: s.disableDefaults, plugins: plugins(s.tp) })
  for (const e of s.entries) {
    const entry = head.push(e.input, e.options as any)
    if (e.dispose)
      entry.dispose()
  }
  return attempt(() => ({ html: renderV3(head, { omitLineBreaks: s.omitLineBreaks }), state: headState(head) }))
}

// A shrunk counterexample must show which half broke, so both halves compare to the same v3 result.
describe('compiled head equals v3 over generated input', () => {
  test.prop([scenario], { numRuns: 600 })('compiled tags, loose, and mixed', (s) => {
    const expected = renderV3Scenario(s)
    const head = createCompiledHead<any>({ disableDefaults: s.disableDefaults, plugins: plugins(s.tp) })
    for (const e of s.entries) {
      const entry = head.push(e.compiled ? toCompiledTags(e.input) : e.input, e.options as any)
      if (e.dispose)
        entry.dispose()
    }
    expect(attempt(() => ({ html: renderCompiled(head, { omitLineBreaks: s.omitLineBreaks }), state: headState(head) }))).toEqual(expected)
    // the memo hit and the memo build must agree
    expect(attempt(() => ({ html: renderCompiled(head, { omitLineBreaks: s.omitLineBreaks }), state: headState(head) }))).toEqual(expected)
  })

  test.prop([input], { numRuns: 800 })('compiled tags rebuild the tags of their input', (raw) => {
    const result = compileTags(raw)
    if (result._tag !== 'Ok')
      return
    // compile leaves out a tag only when sanitize drops it and nothing can dedupe against it
    const isInert = (tag: any) => !dedupeKey(tag) && (
      (!Object.keys(tag.props).length && !tag.innerHTML && !tag.textContent)
      || (tag.tag === 'meta' && (tag.props.content === undefined || tag.props.content === null || tag.props.content === '' || tag.props.content === false)))
    expect(normalizeEntryToTags(toHeadInput(result.tags), [])).toEqual(normalizeEntryToTags(raw, []).filter(tag => !isInert(tag)))
  })
})

const valueText = fc.oneof(
  { weight: 3, arbitrary: fc.constantFrom('', 'a', 'true', 'false', '0', '"', '\'', '<', '>', '&', '/', '$&', '$1', '$$', '%s', '%x', '%', '100%', '%separator', ' x', 'x ', ' ', '</title>', '</script>', '</style>', '</noscript>', '"><script>alert(1)</script>', '@import url(a.css);', dynamicValue(0), dynamicValue(1), '\uE000', '\uE001', '{"a":1}') },
  { weight: 2, arbitrary: fc.string({ maxLength: 8 }) },
)
const valueArbitrary = fc.oneof(
  { weight: 6, arbitrary: valueText },
  { weight: 1, arbitrary: fc.constantFrom(0, 5, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY) },
  { weight: 1, arbitrary: fc.constantFrom(null, undefined, true, false, ['x', 'y'], { a: 1 }) },
)

// each shape takes two values and the same strings go into plain input for v3
const dynamicValueShapes: Record<string, (a: any, b: any) => any> = {
  'title': a => ({ title: a }),
  'title with template': a => ({ title: a, titleTemplate: '%s - site' }),
  'title and params': a => ({ title: a, titleTemplate: '%s %separator %siteName', templateParams: { siteName: 'S', separator: '-' }, meta: [{ name: 'd', content: 'see %s' }] }),
  'meta': (a, b) => ({ meta: [{ name: 'description', content: a }, { property: 'og:title', content: b }] }),
  'data attribute': a => ({ link: [{ 'rel': 'icon', 'key': 'k', 'href': '/a', 'data-x': a }] }),
  'link href by key': (a, b) => ({ link: [{ rel: 'preload', key: 'k', as: 'script', href: a, title: b }] }),
  'html attrs': (a, b) => ({ htmlAttrs: { lang: a, dir: b } }),
  'body attrs': a => ({ bodyAttrs: { 'data-page': a } }),
  'keyed script': a => ({ script: [{ key: 'k', innerHTML: a }] }),
  'keyed json script': a => ({ script: [{ key: 'k', type: 'application/json', innerHTML: a }] }),
  'script with params': a => ({ title: 'T', script: [{ key: 'k', type: 'application/json', innerHTML: a, processTemplateParams: true }] }),
  'keyed noscript': a => ({ noscript: [{ key: 'k', innerHTML: a }] }),
  'base': a => ({ base: { href: a } }),
  'composite text': (a, b) => ({ title: `x ${a} y ${b}`, meta: [{ name: 'd', content: `p ${a}q` }] }),
  'composite next to a param': a => ({ meta: [{ name: 'd', content: `%x${a}` }], templateParams: { xa: 'expanded', x: 'short' } }),
  'composite next to a closing tag': a => ({ script: [{ key: 'k', innerHTML: `</${a}` }] }),
}

function composite(value: any) {
  return value
}

describe('dynamic values equal v3 with the value in place', () => {
  describe.each(Object.keys(dynamicValueShapes))('%s', (shape) => {
    const compiled = compileTags(dynamicValueShapes[shape]!(dynamicValue(0), dynamicValue(1)), { dynamicValues: 2 })
    const compiledTags = compiled._tag === 'Ok' ? compiled.tags : undefined

    test.prop([valueArbitrary, valueArbitrary, fc.boolean()], { numRuns: 150 })('values', (a, b, tp) => {
      expect(compiled._tag).toBe('Ok')
      const v3 = createV3Head({ disableDefaults: true, plugins: plugins(tp) })
      v3.push(dynamicValueShapes[shape]!(composite(a), composite(b)))
      const expected = attempt(() => renderV3(v3))

      const head = createCompiledHead<any>({ disableDefaults: true, plugins: plugins(tp) })
      head.push(compiledTags!, { values: [a, b] })
      // rebuilding the input must also give v3 rules what they would have seen
      expect(attempt(() => renderCompiled(head))).toEqual(expected)
      expect(attempt(() => renderCompiled(head))).toEqual(expected)

      // one loose entry moves the compiled tags to the mixed tier, where they revive with their values
      const loose = { meta: [{ name: 'loose', content: 'x' }] }
      v3.push(loose)
      const mixed = createCompiledHead<any>({ disableDefaults: true, plugins: plugins(tp) })
      mixed.push(compiledTags!, { values: [a, b] })
      mixed.push(loose)
      expect(attempt(() => renderCompiled(mixed))).toEqual(attempt(() => renderV3(v3)))
    })
  })
})
