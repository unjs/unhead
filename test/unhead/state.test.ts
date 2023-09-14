import { describe, it } from 'vitest'
import { createHead, injectHead, useHead } from 'unhead'

describe('state', () => {
  it('exists', async () => {
    await createHead()

    useHead({
      title: 'hello',
    })

    const head = injectHead()
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
