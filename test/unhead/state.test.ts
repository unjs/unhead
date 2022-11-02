import { describe, it } from 'vitest'
import { createHead, getActiveHead, useHead } from '../../packages/unhead'

describe('state', () => {
  it('exists', async () => {
    createHead()

    useHead({
      title: 'hello',
    })

    const head = getActiveHead()
    expect(head.headEntries()).toMatchInlineSnapshot(`
      [
        {
          "_i": 0,
          "_sde": {},
          "input": {
            "title": "hello",
          },
        },
      ]
    `)
  })
})
