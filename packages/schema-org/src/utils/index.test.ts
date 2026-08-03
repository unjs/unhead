import type { Thing } from '../types'
import { resolveDefaultType, stripEmptyProperties } from '.'
import { merge } from '../core/util'

describe('schema.org utilities', () => {
  it('uses the default when the node type is missing', () => {
    const node = {} as Thing

    resolveDefaultType(node, 'Organization')

    expect(node['@type']).toBe('Organization')
  })

  it('works without Object.hasOwn', () => {
    const originalHasOwn = Object.hasOwn
    let merged: any
    let stripped: any
    Object.hasOwn = undefined as any
    try {
      merged = merge({ nested: { first: true } }, { nested: { second: true } })
      stripped = stripEmptyProperties({ empty: '', name: 'Compatible' })
    }
    finally {
      Object.hasOwn = originalHasOwn
    }
    expect(merged).toEqual({ nested: { first: true, second: true } })
    expect(stripped).toEqual({ name: 'Compatible' })
  })
})
