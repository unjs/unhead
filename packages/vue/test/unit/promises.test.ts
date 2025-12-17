import { describe, it } from 'vitest'
import { computed } from 'vue'
import { useHead } from '../../src'
import { PromisesPlugin } from '../../src/plugins'
import { ssrVueAppWithUnhead } from '../util'

describe('vue promises', () => {
  it('basic', async () => {
    const head = await ssrVueAppWithUnhead(() => {
      useHead({
        // @ts-expect-error untyped
        title: new Promise(resolve => resolve('hello')),
        script: [
          // @ts-expect-error untyped
          { src: new Promise(resolve => resolve('https://example.com/script.js')) },
          {
            innerHTML: new Promise<string>(resolve => setTimeout(() => resolve('test'), 250)),
            // @ts-expect-error untyped
            foo: computed(() => 'test'),
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
          "_w": 50,
          "innerHTML": "test",
          "props": {
            "foo": "test",
          },
          "tag": "script",
        },
      ]
    `)
  })
})
