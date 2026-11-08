import { describe, expect, it } from 'vitest'
import { compileTags, dynamicValue, readCompiledEntry, toHeadInput } from '../../../src/compiled'
import { createHead } from '../../../src/compiled/server'

function compiled(input: any, dynamicValues?: number) {
  const result = compileTags(input, { dynamicValues })
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  return result.tags
}

describe('readCompiledEntry on a compiled server head', () => {
  it('returns the compiled tags and values of an entry', () => {
    const tags = compiled({ title: dynamicValue(0) }, 1)
    const head = createHead({ disableDefaults: true })
    head.push(tags, { values: ['Page'] })
    const [entry] = head.entries.values()
    expect(readCompiledEntry(entry!)).toEqual({ tags, values: ['Page'] })
  })

  it('returns nothing for loose input, also after a patch to it', () => {
    const head = createHead({ disableDefaults: true })
    head.push({ title: 'Loose' })
    const patched = head.push(compiled({ title: 'Compiled' }))
    patched.patch({ title: 'Now loose' })
    const [loose, entry] = head.entries.values()
    expect(readCompiledEntry(loose!)).toBeUndefined()
    expect(readCompiledEntry(entry!)).toBeUndefined()
  })
})

describe('toHeadInput', () => {
  it('rebuilds head input with values, or with the values a reader passes for unknown ones', () => {
    const tags = compiled({ title: dynamicValue(0), meta: [{ name: 'description', content: `About ${dynamicValue(1)}` }] }, 2)
    expect(toHeadInput(tags, ['Page', 'us'])).toEqual({ title: 'Page', meta: [{ name: 'description', content: 'About us' }] })
    expect(toHeadInput(tags, ['?', '?'])).toEqual({ title: '?', meta: [{ name: 'description', content: 'About ?' }] })
  })
})
