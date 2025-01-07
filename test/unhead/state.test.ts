import { useHead } from 'unhead'
import { describe, it } from 'vitest'
import { createHeadWithContext } from '../util'

describe('state', () => {
  it('exists', async () => {
    const head = createHeadWithContext()
    useHead({
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
