import { useHead } from 'unhead'
import { describe, it } from 'vitest'
import { createClientHeadWithContext } from '../../util'

describe('state', () => {
  it('exists', async () => {
    const head = createClientHeadWithContext()
    useHead(head, {
      title: 'hello',
    })

    expect(head.headEntries()).toMatchInlineSnapshot(`
      [
        {
          "_i": 0,
          "input": {
            "title": "hello",
          },
        },
      ]
    `)
  })
})
