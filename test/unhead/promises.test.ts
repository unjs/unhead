import { describe, it } from 'vitest'
import { createHead } from 'unhead'

describe('promises', () => {
  it('basic', async () => {
    const head = createHead()
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
          "_h": "5da371e",
          "_p": 0,
          "children": "hello",
          "props": {},
          "tag": "title",
        },
        {
          "_e": 0,
          "_h": "9833eb3",
          "_p": 1,
          "props": {
            "src": "https://example.com/script.js",
          },
          "tag": "script",
        },
        {
          "_e": 0,
          "_h": "2974e38",
          "_p": 2,
          "children": "test",
          "props": {},
          "tag": "script",
        },
      ]
    `)
  })
})
