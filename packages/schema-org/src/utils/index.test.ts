import type { Thing } from '../types'
import { resolveDefaultType } from '.'

describe('resolveDefaultType', () => {
  it('uses the default when the node type is missing', () => {
    const node = {} as Thing

    resolveDefaultType(node, 'Organization')

    expect(node['@type']).toBe('Organization')
  })
})
