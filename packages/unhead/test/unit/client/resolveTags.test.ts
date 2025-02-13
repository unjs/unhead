import { describe, it } from 'vitest'
import { basicSchema, createClientHeadWithContext } from '../../util'

describe('resolveTags', () => {
  it('docs example', async () => {
    const head = createClientHeadWithContext()

    head.push({
      title: 'My title',
      meta: [
        {
          name: 'description',
          content: 'My description',
        },
      ],
    })

    expect(await head.resolveTags()).toMatchInlineSnapshot(`
      [
        {
          "_d": "title",
          "_p": 1024,
          "_w": 10,
          "props": {},
          "tag": "title",
          "textContent": "My title",
        },
        {
          "_d": "meta:description",
          "_p": 1025,
          "_w": 100,
          "props": {
            "content": "My description",
            "name": "description",
          },
          "tag": "meta",
        },
      ]
    `)
  })
  it('basic resolve tags', async () => {
    const head = createClientHeadWithContext()

    head.push(basicSchema)

    const tags = await head.resolveTags()
    expect(tags.length).toBe(5)
    expect(tags).toMatchInlineSnapshot(`
      [
        {
          "_d": "charset",
          "_p": 1027,
          "_w": -20,
          "props": {
            "charset": "utf-8",
          },
          "tag": "meta",
        },
        {
          "_d": undefined,
          "_p": 1026,
          "_w": 50,
          "props": {
            "src": "https://cdn.example.com/script.js",
          },
          "tag": "script",
        },
        {
          "_d": "htmlAttrs",
          "_p": 1024,
          "_w": 100,
          "props": {
            "dir": "ltr",
            "lang": "en",
          },
          "tag": "htmlAttrs",
        },
        {
          "_d": "bodyAttrs",
          "_p": 1025,
          "_w": 100,
          "props": {
            "class": Set {
              "dark",
            },
          },
          "tag": "bodyAttrs",
        },
        {
          "_d": undefined,
          "_p": 1028,
          "_w": 100,
          "props": {
            "href": "https://cdn.example.com/favicon.ico",
            "rel": "icon",
            "type": "image/x-icon",
          },
          "tag": "link",
        },
      ]
    `)
  })

  it('basic /w removal', async () => {
    const head = createClientHeadWithContext()

    const firstEntry = head.push(basicSchema)

    head.push({
      script: [
        {
          src: 'https://cdn.example.com/script2.js',
        },
      ],
    })

    await firstEntry.dispose()

    const tags = await head.resolveTags()
    expect(tags.length).toBe(1)
    expect(tags).toMatchInlineSnapshot(`
      [
        {
          "_d": undefined,
          "_p": 2048,
          "_w": 50,
          "props": {
            "src": "https://cdn.example.com/script2.js",
          },
          "tag": "script",
        },
      ]
    `)
  })

  it('basic /w update', async () => {
    const head = createClientHeadWithContext()

    const firstEntry = head.push(basicSchema)

    await firstEntry.patch({
      ...basicSchema,
      script: [
        {
          src: 'https://cdn.example.com/script2.js',
        },
      ],
    })

    const tags = await head.resolveTags()
    expect(tags.length).toBe(5)
    expect(tags).toMatchInlineSnapshot(`
      [
        {
          "_d": "charset",
          "_p": 1027,
          "_w": -20,
          "props": {
            "charset": "utf-8",
          },
          "tag": "meta",
        },
        {
          "_d": undefined,
          "_p": 1026,
          "_w": 50,
          "props": {
            "src": "https://cdn.example.com/script2.js",
          },
          "tag": "script",
        },
        {
          "_d": "htmlAttrs",
          "_p": 1024,
          "_w": 100,
          "props": {
            "dir": "ltr",
            "lang": "en",
          },
          "tag": "htmlAttrs",
        },
        {
          "_d": "bodyAttrs",
          "_p": 1025,
          "_w": 100,
          "props": {
            "class": Set {
              "dark",
            },
          },
          "tag": "bodyAttrs",
        },
        {
          "_d": undefined,
          "_p": 1028,
          "_w": 100,
          "props": {
            "href": "https://cdn.example.com/favicon.ico",
            "rel": "icon",
            "type": "image/x-icon",
          },
          "tag": "link",
        },
      ]
    `)
  })

  it('class array merge support', async () => {
    const head = createClientHeadWithContext()

    head.push({
      htmlAttrs: {
        class: ['foo', 'bar'],
      },
      bodyAttrs: {
        class: ['foo2', 'bar2'],
      },
    })

    head.push({
      htmlAttrs: {
        class: ['something-new'],
      },
      bodyAttrs: {
        class: 'something-new2',
      },
    })

    const tags = await head.resolveTags()
    expect(tags).toMatchInlineSnapshot(`
      [
        {
          "_d": "htmlAttrs",
          "_p": 2048,
          "_w": 100,
          "props": {
            "class": Set {
              "foo",
              "bar",
              "something-new",
            },
          },
          "tag": "htmlAttrs",
        },
        {
          "_d": "bodyAttrs",
          "_p": 2049,
          "_w": 100,
          "props": {
            "class": Set {
              "foo2",
              "bar2",
              "something-new2",
            },
          },
          "tag": "bodyAttrs",
        },
      ]
    `)
  })

  it('class object merge support', async () => {
    const head = createClientHeadWithContext()

    head.push({
      htmlAttrs: {
        class: {
          foo: true,
          bar: false,
        },
      },
    })

    head.push({
      htmlAttrs: {
        class: {
          bar: true,
        },
      },
    })

    const tags = await head.resolveTags()
    expect(tags).toMatchInlineSnapshot(`
      [
        {
          "_d": "htmlAttrs",
          "_p": 2048,
          "_w": 100,
          "props": {
            "class": Set {
              "foo",
              "bar",
            },
          },
          "tag": "htmlAttrs",
        },
      ]
    `)
  })

  it('duplicate tags', async () => {
    const head = createClientHeadWithContext()

    head.push({
      meta: [
        {
          name: 'description',
          content: 'desc',
        },
        {
          name: 'description',
          content: 'desc 2',
        },
      ],
    })

    const tags = await head.resolveTags()

    expect(tags).toMatchInlineSnapshot(`
      [
        {
          "_d": "meta:description",
          "_p": 1025,
          "_w": 100,
          "props": {
            "content": "desc 2",
            "name": "description",
          },
          "tag": "meta",
        },
      ]
    `)
  })
})
