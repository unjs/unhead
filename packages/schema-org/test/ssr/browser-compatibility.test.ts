import { describe, expect, it } from 'vitest'
import { withoutObjectHasOwn } from '../../../unhead/test/fixtures'
import { merge } from '../../src/core/util'
import { stripEmptyProperties, stripNullProperties } from '../../src/utils'

describe('schema.org browser compatibility', () => {
  it('processes schema data without Object.hasOwn', () => {
    const result = withoutObjectHasOwn(() => {
      return {
        merged: merge({
          nested: {
            first: true,
          },
        }, {
          nested: {
            second: true,
          },
        }),
        noEmpty: stripEmptyProperties({
          empty: '',
          name: 'Compatible',
        }),
        noNull: stripNullProperties({
          name: 'Compatible',
          nullable: null,
        }),
      }
    })

    expect(result.noEmpty).toEqual({
      name: 'Compatible',
    })
    expect(result.noNull).toEqual({
      name: 'Compatible',
    })
    expect(result.merged).toEqual({
      nested: {
        first: true,
        second: true,
      },
    })
  })
})
