import { describe, it } from 'vitest'
import { useHead } from '../../src'
import { PromisesPlugin } from '../../src/plugins'
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
          "_p": 1024,
          "_w": 10,
          "props": {},
          "tag": "title",
          "textContent": "hello",
        },
        {
          "_d": undefined,
          "_p": 1025,
          "_w": 50,
          "props": {
            "src": "https://example.com/script.js",
          },
          "tag": "script",
        },
        {
          "_d": "script:content:test",
          "_p": 1026,
          "_w": 100,
          "innerHTML": "test",
          "props": {},
          "tag": "script",
        },
      ]
    `)
  })
})
