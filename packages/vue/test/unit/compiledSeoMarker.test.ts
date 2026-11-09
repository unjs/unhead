import { useCompiledHead, useCompiledSeoMeta, useStaticCompiledSeoMeta } from '@unhead/vue/compiled'
import { createHead, renderSSRHead } from '@unhead/vue/compiled/server'
import { compileTags, dynamicValue, readEntry } from 'unhead/compiled'
import { describe, expect, it } from 'vitest'
import { createLazyHead } from '../../src/lazy'

function compile(input: unknown, dynamicValues: number): any {
  const result = compileTags(input, { dynamicValues })
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  return result.tags
}

const tags = compile({ title: dynamicValue(0), meta: [{ name: 'description', content: dynamicValue(1) }] }, 2)
const loose = (values: unknown[]) => ({ title: values[0], _flatMeta: { description: values[1] } })

describe('readEntry on a compiled useSeoMeta entry', () => {
  it.each([
    ['the compiled server head', () => createHead({ disableDefaults: true }), (head: any) => renderSSRHead(head)],
    ['a lazy head', () => createLazyHead(), () => {}],
  ])('marks it on %s, and gives its title and description', (_, create, render) => {
    const head = create()
    const seo = useCompiledSeoMeta(tags, loose, ['Title', 'Description'], { head })
    const plain = useCompiledHead(tags, ['Title', 'Description'], { head })
    render(head)
    expect(readEntry(head.entries.get(seo._i)!, head)).toEqual({ input: { title: 'Title', meta: [{ name: 'description', content: 'Description' }] }, seoMeta: true, compiled: true })
    expect(readEntry(head.entries.get(plain._i)!, head).seoMeta).toBe(false)
  })

  it.each([
    ['the compiled server head', () => createHead({ disableDefaults: true }), (head: any) => renderSSRHead(head)],
    ['a lazy head', () => createLazyHead(), () => {}],
  ])('marks a useSeoMeta entry with no values on %s', (_, create, render) => {
    const head = create()
    const staticTags = compile({ title: 'Title', meta: [{ name: 'description', content: 'Description' }] }, 0)
    const seo = useStaticCompiledSeoMeta(staticTags, { head })
    render(head)
    expect(readEntry(head.entries.get(seo._i)!, head)).toEqual({ input: { title: 'Title', meta: [{ name: 'description', content: 'Description' }] }, seoMeta: true, compiled: true })
  })
})
