import type { PropResolver } from '../../../src/types'
import { describe, expect, it } from 'vitest'
import { compileTags, dynamicValue, readEntry } from '../../../src/compiled'
import { createHead, renderSSRHead } from '../../../src/compiled/server'
import { useSeoMeta } from '../../../src/composables'
import { createHead as createV3Head } from '../../../src/server'
import { compiledTagsHead, settle, ssrDom } from './client-util'

function compiled(input: any, dynamicValues?: number) {
  const result = compileTags(input, { dynamicValues })
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  return result.tags
}

const lastEntry = (head: { entries: Map<number, any> }) => [...head.entries.values()].at(-1)!

describe('readEntry on a compiled server head', () => {
  it('reads compiled tags as head input with their values', () => {
    const head = createHead({ disableDefaults: true })
    head.push(compiled({ title: dynamicValue(0), meta: [{ name: 'description', content: `About ${dynamicValue(1)}` }] }, 2), { values: ['Page', 'us'] })
    expect(readEntry(lastEntry(head), head)).toEqual({
      input: { title: 'Page', meta: [{ name: 'description', content: 'About us' }] },
      seoMeta: false,
      compiled: true,
      dynamic: ['title', 'meta.0.content'],
    })
  })

  it('tells a dynamic value from a static one', () => {
    const head = createHead({ disableDefaults: true })
    head.push(compiled({
      title: dynamicValue(0),
      meta: [
        { property: 'og:image', content: '/static.png' },
        { name: 'twitter:image', content: `/og/${dynamicValue(1)}.png` },
      ],
    }, 2), { values: ['Page', 'post'] })
    const reading = readEntry(lastEntry(head), head)
    expect(reading.input.meta).toEqual([
      { property: 'og:image', content: '/static.png' },
      { name: 'twitter:image', content: '/og/post.png' },
    ])
    expect(reading.dynamic).toEqual(['title', 'meta.1.content'])
  })

  it('reads no dynamic value for static compiled tags or loose input', () => {
    const head = createHead({ disableDefaults: true })
    head.push(compiled({ meta: [{ property: 'og:image', content: '/static.png' }] }))
    expect(readEntry(lastEntry(head), head).dynamic).toBeUndefined()
    head.push({ meta: [{ property: 'og:image', content: '/loose.png' }] })
    expect(readEntry(lastEntry(head), head).dynamic).toBeUndefined()
  })

  it('settles a value function once, before the render', () => {
    const head = createHead({ disableDefaults: true })
    let calls = 0
    head.push(compiled({ title: dynamicValue(0) }, 1), { values: () => [`Page ${++calls}`] })
    expect(readEntry(lastEntry(head), head).input).toEqual({ title: 'Page 1' })
    expect(renderSSRHead(head).headTags).toBe('<title>Page 1</title>')
    expect(readEntry(lastEntry(head), head).input).toEqual({ title: 'Page 1' })
    expect(calls).toBe(1)
  })

  it('reads loose input, and a compiled entry patched to loose input', () => {
    const head = createHead({ disableDefaults: true })
    head.push({ title: 'Loose' })
    expect(readEntry(lastEntry(head), head)).toEqual({ input: { title: 'Loose' }, seoMeta: false, compiled: false })
    head.push(compiled({ title: 'Compiled' })).patch({ title: 'Now loose' })
    expect(readEntry(lastEntry(head), head)).toEqual({ input: { title: 'Now loose' }, seoMeta: false, compiled: false })
  })

  it('reports compiled tags pushed with the seoMeta option, and renders as without it', () => {
    const tags = compiled({ meta: [{ name: 'description', content: 'Desc' }] })
    const head = createHead({ disableDefaults: true })
    head.push(tags, { seoMeta: true })
    const plain = createHead({ disableDefaults: true })
    plain.push(tags)
    expect(readEntry(lastEntry(head), head)).toEqual({ input: { meta: [{ name: 'description', content: 'Desc' }] }, seoMeta: true, compiled: true })
    expect(renderSSRHead(head)).toEqual(renderSSRHead(plain))
  })
})

describe('readEntry on loose useSeoMeta input', () => {
  it('unpacks the flat meta keys to meta tags', () => {
    const head = createV3Head({ disableDefaults: true })
    useSeoMeta(head, { title: 'Page', description: 'Desc', ogImage: { url: '/og.png', width: 1200 } })
    expect(readEntry(lastEntry(head), head)).toEqual({
      input: {
        title: 'Page',
        titleTemplate: undefined,
        // in the order `FlatMetaPlugin` adds them
        meta: [
          { property: 'og:image', content: '/og.png' },
          { property: 'og:image:width', content: 1200 },
          { name: 'description', content: 'Desc' },
        ],
      },
      seoMeta: true,
      compiled: false,
    })
  })

  it('resolves values with the prop resolvers of the head before it unpacks them', () => {
    const ref = (value: unknown) => ({ __ref: true, value })
    const resolve: PropResolver = (_, value) => value?.__ref ? value.value : value
    const head = createV3Head({ disableDefaults: true, propResolvers: [resolve] })
    useSeoMeta(head, { title: () => 'Page', description: ref('Desc') as any })
    expect(readEntry(lastEntry(head), head).input).toEqual({
      title: 'Page',
      titleTemplate: undefined,
      meta: [{ name: 'description', content: 'Desc' }],
    })
  })
})

describe('readEntry on a lazy head', () => {
  it('reads an entry, then its pending patch', () => {
    const dom = ssrDom([{ input: { title: 'x' } }], 'none')
    const head = compiledTagsHead({ document: dom.window.document })
    const entry = head.push(compiled({ title: dynamicValue(0) }, 1), { values: ['x'] })
    expect(readEntry(head.entries.get(entry._i)!, head)).toEqual({ input: { title: 'x' }, seoMeta: false, compiled: true, dynamic: ['title'] })
    head.blockLoad()
    entry.patch(compiled({ title: `${dynamicValue(0)}!` }, 1), { values: ['y'] })
    expect(readEntry(head.entries.get(entry._i)!, head)).toEqual({ input: { title: 'y!' }, seoMeta: false, compiled: true, dynamic: ['title'] })
    entry.patch({ title: 'loose' })
    expect(readEntry(head.entries.get(entry._i)!, head)).toEqual({ input: { title: 'loose' }, seoMeta: false, compiled: false })
  })

  it('reports the seoMeta option', () => {
    const head = compiledTagsHead({ document: ssrDom([], 'none').window.document })
    const entry = head.push(compiled({ meta: [{ name: 'description', content: 'Desc' }] }), { seoMeta: true })
    expect(readEntry(head.entries.get(entry._i)!, head).seoMeta).toBe(true)
  })

  it('reads loose input once the full runtime turns the entry into loose input', async () => {
    const dom = ssrDom([{ input: { title: 'x' } }], 'none')
    const head = compiledTagsHead({ document: dom.window.document })
    const entry = head.push(compiled({ title: dynamicValue(0) }, 1), { values: ['x'] })
    head.push({ title: 'loose' })
    head.render()
    await head.load()
    await settle()
    expect(readEntry(head.entries.get(entry._i)!, head)).toEqual({ input: { title: 'x' }, seoMeta: false, compiled: false })
  })
})
