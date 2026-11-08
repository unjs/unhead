import { useCompiledHead, useCompiledSeoMeta } from '@unhead/vue/compiled'
import { createHead, renderSSRHead } from '@unhead/vue/compiled/server'
import { compileTags, dynamicValue, readCompiledEntry, toHeadInput } from 'unhead/compiled'
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

describe('readCompiledEntry on a compiled useSeoMeta entry', () => {
  it.each([
    ['the compiled server head', () => createHead({ disableDefaults: true }), (head: any) => renderSSRHead(head)],
    ['a lazy head', () => createLazyHead(), () => {}],
  ])('marks it on %s, and gives its title and description', (_, create, render) => {
    const head = create()
    const seo = useCompiledSeoMeta(tags, loose, ['Title', 'Description'], { head })
    const plain = useCompiledHead(tags, ['Title', 'Description'], { head })
    render(head)
    const read = readCompiledEntry(head.entries.get(seo._i)!)!
    expect(read.seoMeta).toBe(true)
    expect(toHeadInput(read.tags, read.values)).toEqual({ title: 'Title', meta: [{ name: 'description', content: 'Description' }] })
    expect(readCompiledEntry(head.entries.get(plain._i)!)!.seoMeta).toBeUndefined()
  })
})
