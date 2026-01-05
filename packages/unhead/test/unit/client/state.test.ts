import { describe, it } from 'vitest'
import { useHead } from '../../../src'
import { createClientHeadWithContext } from '../../util'

describe('state', () => {
  it('exists', async () => {
    const head = createClientHeadWithContext()
    useHead(head, {
      title: 'hello',
    })

    expect(head.entries).toMatchInlineSnapshot(`
      Map {
        1 => {
          "_dirty": true,
          "_i": 1,
          "input": {
            "title": "hello",
          },
          "options": {},
        },
      }
    `)
  })
})
