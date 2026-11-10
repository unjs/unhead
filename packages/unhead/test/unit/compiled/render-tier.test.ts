import { describe, expect, it } from 'vitest'
import { compileTags, createHead, getRenderTier } from '../../../src/compiled/server'
import { InferSeoMetaPlugin, TemplateParamsPlugin } from '../../../src/plugins'
import { createHead as createV3Head } from '../../../src/server'

const tags = (compileTags({ title: 'Page', meta: [{ name: 'description', content: 'About' }] }) as any).tags

describe('getRenderTier', () => {
  it('is Memo for compiled tags with native plugins', () => {
    const head = createHead({ plugins: [TemplateParamsPlugin, InferSeoMetaPlugin()] })
    head.push(tags)
    expect(getRenderTier(head)).toEqual({ _tag: 'Memo' })
  })

  it('is Fast for a loose entry', () => {
    const head = createHead()
    head.push(tags)
    head.push({ title: 'Loose' })
    expect(getRenderTier(head)).toEqual({ _tag: 'Fast', reason: '1 entry is not compiled tags with no options' })
  })

  it('is Fast for compiled tags with entry options', () => {
    const head = createHead()
    head.push(tags, { tagPriority: 'low' })
    expect(getRenderTier(head)._tag).toBe('Fast')
  })

  it.each([
    ['ogTitle', { ogTitle: (title?: string) => title?.replace(/ \| .*$/, '') ?? '' }],
    ['ogDescription', { ogDescription: (description?: string) => description ?? '' }],
  ])('is Fast for an InferSeoMetaPlugin %s function', (_, options) => {
    const head = createHead({ plugins: [InferSeoMetaPlugin(options)] })
    head.push(tags)
    expect(getRenderTier(head)).toEqual({ _tag: 'Fast', reason: 'InferSeoMetaPlugin has an ogTitle or ogDescription function' })
  })

  it('is Full for a foreign listener', () => {
    const head = createHead()
    head.push(tags)
    head.hooks.hook('tags:afterResolve', () => {})
    expect(getRenderTier(head)).toEqual({ _tag: 'Full', reason: 'a listener on the tags:afterResolve hook' })
  })

  it('is Full for a plugin with a native key and other hooks', () => {
    const head = createHead({ plugins: [Object.assign(() => ({ key: 'infer-seo-meta', hooks: { 'tags:resolve': () => {} } }), { key: 'infer-seo-meta' })] })
    head.push(tags)
    expect(getRenderTier(head)._tag).toBe('Full')
  })

  it('is Full for a head of unhead/server', () => {
    expect(getRenderTier(createV3Head() as any)).toEqual({ _tag: 'Full', reason: 'the head does not come from a compiled server entry' })
  })
})
