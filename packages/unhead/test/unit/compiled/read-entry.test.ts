import { describe, expect, it } from 'vitest'
import { compileTags, createHead, dynamicValue, toHeadInput } from '../../../src/compiled/server'

function compiled(input: any, dynamicValues?: number) {
  const result = compileTags(input, { dynamicValues })
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  return result.tags
}

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
