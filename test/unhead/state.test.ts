import { createHead, getActiveHead, useHead } from 'unhead'
import { describe, it } from 'vitest'

describe('state', () => {
  it('exists', async () => {
    await createHead()

    useHead({
      title: 'hello',
    })

    const head = getActiveHead()
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
