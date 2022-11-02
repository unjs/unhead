import { createHead, renderHeadToString } from '../src'

describe('tag priority', () => {
  test('charset first', async () => {
    const head = createHead()
    head.addEntry({
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
    head.addEntry({
      meta: [
        {
          charset: 'utf-8',
        },
      ],
    })
    const { headTags } = await renderHeadToString(head)
    expect(headTags.startsWith('<meta charset="utf-8">')).toBeTruthy()
  })

  test('base early', async () => {
    const head = createHead()
    head.addEntry({
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
    head.addEntry({
      meta: [
        {
          charset: 'utf-8',
        },
      ],
      base: {
        href: '/base',
      },
    })
    const { headTags } = await renderHeadToString(head)
    expect(
      headTags.startsWith('<meta charset="utf-8"><base href="/base">'),
    ).toBeTruthy()
  })

  test('CSP early', async () => {
    const head = createHead()
    head.addEntry({
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
    head.addEntry({
      meta: [
        {
          'http-equiv': 'content-security-policy',
          'content': 'test',
        },
      ],
    })
    const { headTags } = await renderHeadToString(head)
    expect(
      headTags.startsWith(
        '<meta http-equiv="content-security-policy" content="test">',
      ),
    ).toBeTruthy()
  })

  test('manual priority', async () => {
    const head = createHead()
    head.addEntry({
      script: [
        {
          src: '/not-important-script.js',
        },
      ],
    })
    head.addEntry({
      script: [
        {
          src: '/very-important-script.js',
          renderPriority: 1,
        },
      ],
    })
    const { headTags } = await renderHeadToString(head)
    expect(headTags).toMatchInlineSnapshot(
      '"<script src=\\"/very-important-script.js\\"></script><script src=\\"/not-important-script.js\\"></script><meta name=\\"head:count\\" content=\\"2\\">"',
    )
    expect(
      headTags.startsWith('<script src="/very-important-script.js">'),
    ).toBeTruthy()
  })
})
