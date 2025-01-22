import { useHead } from '@unhead/vue'
import { PromisesPlugin } from 'unhead/plugins/promises'
import { describe, it } from 'vitest'
import { ssrVueAppWithUnhead } from '../util'

describe('vue promises', () => {
  it('basic', async () => {
    const head = await ssrVueAppWithUnhead(() => {
      useHead({
        title: new Promise(resolve => resolve('hello')),
        script: [
          { src: new Promise(resolve => resolve('https://example.com/script.js')) },
          {
            innerHTML: new Promise<string>(resolve => setTimeout(() => resolve('test'), 250)),
          },
        ],
      })
    }, {
      plugins: [PromisesPlugin],
    })

    expect(await head.resolveTags()).toMatchInlineSnapshot(`
      [
        {
          "_d": "title",
          "_e": 0,
          "_p": 0,
          "props": {},
          "tag": "title",
          "textContent": "hello",
        },
        {
          "_e": 0,
          "_p": 1,
          "props": {
            "src": "https://example.com/script.js",
          },
          "tag": "script",
        },
        {
          "_e": 0,
          "_p": 2,
          "innerHTML": "test",
          "props": {},
          "tag": "script",
        },
      ]
    `)
  })
})
