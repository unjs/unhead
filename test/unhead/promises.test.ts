import { describe, it } from 'vitest'
import { PromisesPlugin } from '../../packages/unhead/src/optionalPlugins/promises'
import { createHeadWithContext } from '../util'

describe('promises', () => {
  it('basic', async () => {
    const head = createHeadWithContext({
      plugins: [PromisesPlugin],
    })
    head.push({
      title: new Promise(resolve => resolve('hello')),
      script: [
        { src: new Promise(resolve => resolve('https://example.com/script.js')) },
        {
          children: new Promise<string>(resolve => setTimeout(() => resolve('test'), 250)),
        },
      ],
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
