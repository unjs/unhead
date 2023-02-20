import { createHead } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'

describe('tag priority', () => {
  test('basic int', async () => {
    const head = createHead()
    head.push({
      script: [
        {
          src: '/not-important-script.js',
        },
      ],
    })
    head.push({
      script: [
        {
          src: '/very-important-script.js',
          tagPriority: 'critical',
        },
      ],
    })

    expect(await head.resolveTags()).toMatchInlineSnapshot(`
      [
        {
          "_e": 1,
          "_h": "4d3ad5d",
          "_p": 1024,
          "props": {
            "src": "/very-important-script.js",
          },
          "tag": "script",
          "tagPriority": "critical",
        },
        {
          "_e": 0,
          "_h": "a24420",
          "_p": 0,
          "props": {
            "src": "/not-important-script.js",
          },
          "tag": "script",
        },
      ]
    `)
  })
  test('charset first', async () => {
    const head = createHead()
    head.push({
      script: [
        {
          src: '/my-important-script.js',
        },
      ],
      meta: [
        {
          name: 'something-else',
          content: 'test',
        },
        {
          name: 'description',
          content: 'desc',
        },
      ],
    })
    head.push({
      meta: [
        {
          charset: 'utf-8',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags.startsWith('<meta charset="utf-8"')).toBeTruthy()
  })

  test('base early', async () => {
    const head = createHead()
    head.push({
      script: [
        {
          src: '/my-important-script.js',
        },
      ],
      meta: [
        {
          name: 'something-else',
          content: 'test',
        },
        {
          name: 'description',
          content: 'desc',
        },
      ],
    })
    head.push({
      meta: [
        {
          charset: 'utf-8',
        },
      ],
      base: {
        href: '/base',
      },
    })
    const { headTags } = await renderSSRHead(head)
    expect(
      headTags.startsWith('<meta charset="utf-8"'),
    ).toBeTruthy()
  })

  test('CSP early', async () => {
    const head = createHead()
    head.push({
      script: [
        {
          src: '/my-important-script.js',
        },
      ],
      meta: [
        {
          name: 'something-else',
          content: 'test',
        },
        {
          name: 'description',
          content: 'desc',
        },
      ],
    })
    head.push({
      meta: [
        {
          'http-equiv': 'content-security-policy',
          'content': 'test',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(
      headTags.startsWith(
        '<meta http-equiv="content-security-policy" content="test"',
      ),
    ).toBeTruthy()
  })

  test('manual priority', async () => {
    const head = createHead()
    head.push({
      script: [
        {
          src: '/not-important-script.js',
        },
      ],
    })
    head.push({
      script: [
        {
          src: '/very-important-script.js',
          tagPriority: -1,
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `
      "<script src=\\"/very-important-script.js\\"></script>
      <script src=\\"/not-important-script.js\\"></script>
      <meta property=\\"unhead:ssr\\" content=\\"7a2ba30\\">"
    `,
    )
    expect(
      headTags.startsWith('<script src="/very-important-script.js"'),
    ).toBeTruthy()
  })

  test('before priority', async () => {
    const head = createHead()
    head.push({
      script: [
        {
          key: 'not-important',
          src: '/not-important-script.js',
        },
      ],
    })
    head.push({
      script: [
        {
          tagPriority: 'before:script:not-important',
          src: '/must-be-first-script.js',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `
      "<script src=\\"/must-be-first-script.js\\"></script>
      <script src=\\"/not-important-script.js\\"></script>
      <meta property=\\"unhead:ssr\\" content=\\"528ce3\\">"
    `,
    )
  })

  test('before and after priority', async () => {
    const head = createHead()
    head.push({
      script: [
        {
          key: 'first-script',
          src: '/must-be-first-script.js',
        },
      ],
    })
    head.push({
      script: [
        {
          key: 'not-important',
          src: '/not-important-script.js',
        },
      ],
    })
    head.push({
      script: [
        {
          src: '/before-not-important.js',
          tagPriority: 'before:script:not-important',
        },
      ],
    })
    head.push({
      script: [
        {
          src: '/after-first-script.js',
          tagPriority: 'after:script:first-script',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `
      "<script src=\\"/must-be-first-script.js\\"></script>
      <script src=\\"/after-first-script.js\\"></script>
      <script src=\\"/before-not-important.js\\"></script>
      <script src=\\"/not-important-script.js\\"></script>
      <meta property=\\"unhead:ssr\\" content=\\"1f0bc13\\">"
    `,
    )
  })
})
