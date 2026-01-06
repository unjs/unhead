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
          "_i": 1,
          "_o": {
            "title": "hello",
          },
          "input": {
            "title": "hello",
          },
          "options": {},
        },
      }
    `)
  })
})
