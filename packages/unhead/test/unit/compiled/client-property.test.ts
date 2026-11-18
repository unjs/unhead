import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'
import { createPair } from './client-util'

const text = fc.constantFrom('a', 'b c', '%s', '%siteName', '100%', '$&', '"q"', '<x>', '</script>', 'true', 'é', '')
const config = {
  tagPriority: fc.constantFrom('high', 'low', 'critical', -5, 0, 55),
  tagPosition: fc.constantFrom('head', 'bodyClose', 'bodyOpen'),
  tagDuplicateStrategy: fc.constantFrom('merge', 'replace'),
  key: fc.constantFrom('k1', 'k2'),
}
const optional = { requiredKeys: [] as never[], noNullPrototype: true }
const meta = fc.record({
  'name': fc.constantFrom('description', 'keywords', 'x', 'theme-color', 'og:x'),
  'property': fc.constantFrom('og:image', 'og:title', 'article:tag'),
  'content': fc.oneof(text, fc.array(text, { maxLength: 2 })),
  'data-hid': fc.constantFrom('k1', 'h'),
  'class': fc.constantFrom('a', 'a b'),
  ...config,
}, optional)
const link = fc.record({
  rel: fc.constantFrom('canonical', 'alternate', 'preload', 'stylesheet', 'icon'),
  href: fc.constantFrom('/a', '/b', '/%x'),
  hreflang: fc.constantFrom('en', 'fr'),
  id: fc.constantFrom('i1', 'i2'),
  class: fc.constantFrom('a', 'b c'),
  crossorigin: fc.constantFrom('', 'anonymous', true),
  ...config,
}, optional)
const script = fc.record({
  src: fc.constantFrom('/a.js', '/b.js'),
  defer: fc.boolean(),
  type: fc.constantFrom('module', 'application/ld+json', 'text/plain'),
  innerHTML: text,
  textContent: text,
  ...config,
}, optional)
const attrs = fc.record({
  'lang': fc.constantFrom('en', 'fr', '%locale'),
  'class': fc.oneof(fc.constantFrom('', 'a', 'a b', 'b c'), fc.record({ x: fc.boolean(), y: fc.boolean() }, { noNullPrototype: true })),
  'style': fc.constantFrom('', 'a:b', 'a:b;c:d', 'c: e'),
  'data-a': fc.constantFrom('1', '2', true, false),
  'tagDuplicateStrategy': config.tagDuplicateStrategy,
}, optional)
const input = fc.record({
  title: fc.oneof(text, fc.constantFrom(null, 5)),
  titleTemplate: fc.constantFrom('%s - b', '%s %separator %siteName', 'fixed', '', null),
  templateParams: fc.record({ separator: fc.constantFrom('|', '-'), siteName: text, locale: fc.constantFrom('de') }, optional),
  meta: fc.array(meta, { maxLength: 4 }),
  link: fc.array(link, { maxLength: 3 }),
  script: fc.array(script, { maxLength: 2 }),
  noscript: fc.array(text, { maxLength: 1 }),
  base: fc.record({ href: fc.constantFrom('/', '/x/') }, optional),
  htmlAttrs: attrs,
  bodyAttrs: attrs,
}, optional)

const op = fc.oneof(
  fc.record({ kind: fc.constant('push' as const), input, options: fc.option(fc.record({ tagPriority: config.tagPriority, tagPosition: config.tagPosition }, optional), { nil: undefined }) }),
  fc.record({ kind: fc.constant('patch' as const), at: fc.nat(), input }),
  fc.record({ kind: fc.constant('dispose' as const), at: fc.nat() }),
  fc.record({ kind: fc.constant('render' as const) }),
)

const scenario = fc.record({
  params: fc.constantFrom('none', 'plugin', 'lazy') as fc.Arbitrary<'none' | 'plugin' | 'lazy'>,
  server: fc.array(input, { minLength: 1, maxLength: 3 }),
  // a change before the first render tests adoption of what hydration rendered
  early: fc.array(op, { maxLength: 3 }),
  ops: fc.array(op, { maxLength: 8 }),
})

describe('compiled runtime equals the v3 client head over generated sequences', () => {
  test.prop([scenario], { numRuns: 300 })('push, patch, dispose, and render', async (s) => {
    const pair = createPair(s.server.map(i => ({ input: i })), s.params)
    const entries = s.server.map(i => pair.push(i))
    const run = async (ops: typeof s.ops) => {
      for (const o of ops) {
        if (o.kind === 'push')
          entries.push(pair.push(o.input, o.options as any))
        else if (o.kind === 'patch' && entries.length)
          entries[o.at % entries.length]!.patch(o.input)
        else if (o.kind === 'dispose' && entries.length)
          entries[o.at % entries.length]!.dispose()
        else if (o.kind === 'render')
          await pair.render()
        if (o.kind === 'render')
          expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
      }
    }
    pair.v3.render()
    pair.compiled.render()
    pair.compiled.blockLoad()
    await run(s.early)
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
    await run(s.ops)
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
  }, 600_000)
})
