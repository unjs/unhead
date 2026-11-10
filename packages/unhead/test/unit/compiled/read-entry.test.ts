import type { PropResolver } from '../../../src/types'
import { describe, expect, it } from 'vitest'
import { createHead as createClientHead } from '../../../src/client'
import { compileTags, dynamicValue, readEntry } from '../../../src/compiled'
import { createHead, getRenderTier, renderSSRHead } from '../../../src/compiled/server'
import { FLAG_UNDEFINED_DROPS, toHeadInput } from '../../../src/compiled/tags'
import { useSeoMeta } from '../../../src/composables'
import { createHead as createV3Head, renderSSRHead as renderV3 } from '../../../src/server'

function compiled(input: any, dynamicValues?: number) {
  const result = compileTags(input, { dynamicValues })
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  return result.tags
}

const lastEntry = (head: { entries: Map<number, any> }) => [...head.entries.values()].at(-1)!

describe('the input of a compiled server entry', () => {
  it('reads as the head input it came from, with its values', () => {
    const head = createHead({ disableDefaults: true })
    head.push(compiled({ title: dynamicValue(0), meta: [{ name: 'description', content: 'About' }] }, 1), { values: ['Page'] })
    const [entry] = head.entries.values()
    expect(entry!.input).toEqual({ title: 'Page', meta: [{ name: 'description', content: 'About' }] })
  })

  it('reads loose input after a patch to it', () => {
    const head = createHead({ disableDefaults: true })
    const active = head.push(compiled({ title: 'Compiled' }))
    active.patch({ title: 'Now loose' })
    const [entry] = head.entries.values()
    expect(entry!.input).toEqual({ title: 'Now loose' })
  })
})

describe('toHeadInput', () => {
  it('rebuilds head input with values, or with the values a reader passes for unknown ones', () => {
    const tags = compiled({ title: dynamicValue(0), meta: [{ name: 'description', content: `About ${dynamicValue(1)}` }] }, 2)
    expect(toHeadInput(tags, ['Page', 'us'])).toEqual({ title: 'Page', meta: [{ name: 'description', content: 'About us' }] })
    expect(toHeadInput(tags, ['?', '?'])).toEqual({ title: '?', meta: [{ name: 'description', content: 'About ?' }] })
  })
})

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

  it('gives each dynamic value the path it has in the input when an undefined value omits a tag', () => {
    const tags = compiled({
      meta: [
        { name: 'description', content: dynamicValue(0) },
        { name: 'author', content: 'Harlan' },
        { property: 'og:image', content: dynamicValue(1) },
      ],
    }, 2)
    // the build marks a `useSeoMeta` tag that v3 omits for an undefined value
    for (const tag of tags as any[])
      tag[5] |= FLAG_UNDEFINED_DROPS
    const head = createHead({ disableDefaults: true })
    head.push(tags, { values: [undefined, '/og.png'] } as any)
    const reading = readEntry(lastEntry(head), head)
    expect(reading.input.meta).toEqual([
      { name: 'author', content: 'Harlan' },
      { property: 'og:image', content: '/og.png' },
    ])
    expect(reading.dynamic).toEqual(['meta.1.content'])
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
    const tags = compiled({ title: dynamicValue(0), meta: [{ name: 'description', content: 'Desc' }] }, 1)
    const head = createHead({ disableDefaults: true })
    head.push(tags, { seoMeta: true, values: ['Page'] })
    const plain = createHead({ disableDefaults: true })
    plain.push(tags, { values: ['Page'] })
    expect(readEntry(lastEntry(head), head)).toEqual({ input: { title: 'Page', meta: [{ name: 'description', content: 'Desc' }] }, seoMeta: true, compiled: true, dynamic: ['title'] })
    expect(renderSSRHead(head)).toEqual(renderSSRHead(plain))
  })

  it('keeps the tier of an entry pushed with the seoMeta option', () => {
    const tags = compiled({ meta: [{ name: 'description', content: 'Desc' }] })
    const head = createHead({ disableDefaults: true })
    head.push(tags, { seoMeta: true })
    expect(getRenderTier(head)).toEqual({ _tag: 'Memo' })
  })
})

describe('readEntry on a v3 head', () => {
  it('unpacks the flat meta keys of useSeoMeta input to meta tags', () => {
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

  it('omits a flat meta tag whose value is undefined, as the render does', () => {
    const head = createV3Head({ disableDefaults: true })
    useSeoMeta(head, { description: undefined, ogTitle: '', charset: 'utf-8', ogImage: [{ url: '/og.png', width: undefined }] })
    expect(renderV3(head).headTags).toBe('<meta charset="utf-8">\n<meta property="og:image" content="/og.png">\n<meta property="og:title" content>')
    // an empty value stays as the input gave it, as it does for compiled tags
    expect(readEntry(lastEntry(head), head).input.meta).toEqual([
      { property: 'og:image', content: '/og.png' },
      { property: 'og:title', content: '' },
      { charset: 'utf-8' },
    ])
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

  it('reports loose input pushed with the seoMeta option', () => {
    const head = createV3Head({ disableDefaults: true })
    head.push({ title: 'Page' }, { seoMeta: true })
    expect(readEntry(lastEntry(head), head)).toEqual({ input: { title: 'Page' }, seoMeta: true, compiled: false })
  })

  it('reads the pending patch of a client entry', () => {
    const head = createClientHead({ document: false as any })
    const active = head.push({ title: 'First' })
    active.patch({ title: 'Second' })
    expect(readEntry(head.entries.get(active._i)!, head).input).toEqual({ title: 'Second' })
  })
})
