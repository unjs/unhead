import { describe, expect, it } from 'vitest'
import { compileTags, dynamicValue, readCompiledEntry } from '../../../src/compiled'
import { compiledTagsHead, settle, ssrDom } from './client-util'

function compile(input: unknown, dynamicValues?: number): any {
  const result = compileTags(input, { dynamicValues })
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  return result.tags
}

describe('readCompiledEntry on a lazy head', () => {
  it('returns the compiled tags and values of an entry, then of its patch', () => {
    const dom = ssrDom([{ input: { title: 'x' } }], 'none')
    const head = compiledTagsHead({ document: dom.window.document })
    const first = compile({ title: dynamicValue(0) }, 1)
    const next = compile({ title: `${dynamicValue(0)}!` }, 1)
    const entry = head.push(first, { values: ['x'] })
    expect(readCompiledEntry(head.entries.get(entry._i)!)).toEqual({ tags: first, values: ['x'] })
    head.blockLoad()
    entry.patch(next, { values: ['y'] })
    expect(readCompiledEntry(head.entries.get(entry._i)!)).toEqual({ tags: next, values: ['y'] })
    entry.patch({ title: 'loose' })
    expect(readCompiledEntry(head.entries.get(entry._i)!)).toBeUndefined()
  })

  it('returns nothing once the full runtime turns the entry into loose input', async () => {
    const dom = ssrDom([{ input: { title: 'x' } }], 'none')
    const head = compiledTagsHead({ document: dom.window.document })
    const entry = head.push(compile({ title: dynamicValue(0) }, 1), { values: [''] })
    head.push({ title: 'loose' })
    head.render()
    await head.load()
    await settle()
    expect(readCompiledEntry(head.entries.get(entry._i)!)).toBeUndefined()
  })
})
