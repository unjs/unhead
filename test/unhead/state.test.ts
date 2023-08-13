import { describe, it } from 'vitest'
import { createHead, getActiveHead, useHead } from 'unhead'

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
