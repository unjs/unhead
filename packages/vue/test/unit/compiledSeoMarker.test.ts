import { createHead, renderSSRHead, useCompiledHead, useCompiledSeoMeta, useStaticCompiledSeoMeta } from '@unhead/vue/compiled/server'
import { compileTags, dynamicValue, readEntry } from 'unhead/compiled'
import { describe, expect, it } from 'vitest'

function compile(input: unknown, dynamicValues: number): any {
  const result = compileTags(input, { dynamicValues })
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  return result.tags
}

const tags = compile({ title: dynamicValue(0), meta: [{ name: 'description', content: dynamicValue(1) }] }, 2)
const loose = (values: unknown[]) => ({ title: values[0], _flatMeta: { description: values[1] } })

describe('readEntry on a compiled useSeoMeta entry', () => {
  it('reports seoMeta for the entry, and gives its title and description', () => {
    const head = createHead({ disableDefaults: true })
    const seo = useCompiledSeoMeta(tags, loose, ['Title', 'Description'], { head })
    const plain = useCompiledHead(tags, ['Title', 'Description'], { head })
    renderSSRHead(head)
    expect(readEntry(head.entries.get(seo._i)!, head)).toEqual({ input: { title: 'Title', meta: [{ name: 'description', content: 'Description' }] }, seoMeta: true, compiled: true, dynamic: ['title', 'meta.0.content'] })
    expect(readEntry(head.entries.get(plain._i)!, head).seoMeta).toBe(false)
  })

  it('reports seoMeta for an entry that took the flat meta input', () => {
    const head = createHead({ disableDefaults: true })
    const seo = useCompiledSeoMeta(tags, loose, ['Title', ''], { head })
    renderSSRHead(head)
    expect(readEntry(head.entries.get(seo._i)!, head)).toEqual({ input: { title: 'Title', meta: [{ name: 'description', content: '' }] }, seoMeta: true, compiled: false })
  })

  it('reports seoMeta for a useSeoMeta entry with no values', () => {
    const head = createHead({ disableDefaults: true })
    const staticTags = compile({ title: 'Title', meta: [{ name: 'description', content: 'Description' }] }, 0)
    const seo = useStaticCompiledSeoMeta(staticTags, { head })
    renderSSRHead(head)
    expect(readEntry(head.entries.get(seo._i)!, head)).toEqual({ input: { title: 'Title', meta: [{ name: 'description', content: 'Description' }] }, seoMeta: true, compiled: true })
  })

  it('renders an entry with the seoMeta marker as one without it', () => {
    const marked = createHead({ disableDefaults: true })
    useCompiledSeoMeta(tags, loose, ['Title', 'Description'], { head: marked })
    const plain = createHead({ disableDefaults: true })
    useCompiledHead(tags, ['Title', 'Description'], { head: plain })
    expect(renderSSRHead(marked)).toEqual(renderSSRHead(plain))
  })
})
