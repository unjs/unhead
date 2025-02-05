import { useHead } from 'unhead'
import { describe, it } from 'vitest'
import { createClientHeadWithContext } from '../../util'

describe('state', () => {
  it('exists', async () => {
    const head = createClientHeadWithContext()
    useHead(head, {
      title: 'hello',
    })

    expect(head.entries).toMatchInlineSnapshot(`
      {
        "0": {
          "_i": 0,
          "input": {
            "title": "hello",
          },
          "options": {},
        },
      }
    `)
  })
})
