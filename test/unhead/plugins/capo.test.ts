import { describe, it } from 'vitest'
import { CapoPlugin, createHead } from 'unhead'

describe('capo', () => {
  it('basic', async () => {
    const head = createHead({
      plugins: [
        CapoPlugin(),
      ],
    })
    // add each type of capo tag in a random order
    head.push({
      script: {
        defer: true,
        src: 'defer-script.js',
      },
    })
    head.push({
      script: {
        src: 'sync-script.js',
      },
    })
    head.push({
      style: [
        '.sync-style { color: red }',
      ],
    })
    head.push({
      link: {
        rel: 'modulepreload',
        href: 'modulepreload.js',
      },
    })
    head.push({
      script: {
        src: 'async-script.js',
        async: true,
      },
    })
    head.push({
      link: {
        rel: 'preload',
        href: 'preload.js',
      },
    })
    head.push({
      style: [
        '@import "imported.css"',
      ],
    })
    head.push({
      link: {
        rel: 'stylesheet',
        href: 'sync-styles.css',
      },
    })
    head.push({
      title: 'title',
    })
    // preconnect
    head.push({
      link: {
        rel: 'preconnect',
        href: 'https://example.com',
      },
    })
    // dns-prefetch
    head.push({
      link: {
        rel: 'dns-prefetch',
        href: 'https://example.com',
      },
    })
    // prefetch
    head.push({
      link: {
        rel: 'prefetch',
        href: 'https://example.com',
      },
    })
    // prerender
    head.push({
      link: {
        rel: 'prerender',
        href: 'https://example.com',
      },
    })
    // meta
    head.push({
      meta: {
        name: 'description',
        content: 'description',
      },
    })

    expect(await head.resolveTags()).toMatchInlineSnapshot(`
      [
        {
          "_d": "title",
          "_e": 8,
          "_p": 8192,
          "props": {},
          "tag": "title",
          "textContent": "title",
        },
        {
          "_e": 9,
          "_p": 9216,
          "props": {
            "href": "https://example.com",
            "rel": "preconnect",
          },
          "tag": "link",
        },
        {
          "_e": 4,
          "_p": 4096,
          "props": {
            "async": "",
            "src": "async-script.js",
          },
          "tag": "script",
          "tagPriority": 3,
        },
        {
          "_e": 6,
          "_p": 6144,
          "innerHTML": "@import \\"imported.css\\"",
          "props": {},
          "tag": "style",
          "tagPriority": 4,
        },
        {
          "_e": 1,
          "_p": 1024,
          "props": {
            "src": "sync-script.js",
          },
          "tag": "script",
          "tagPriority": 5,
        },
        {
          "_e": 2,
          "_p": 2048,
          "innerHTML": ".sync-style { color: red }",
          "props": {},
          "tag": "style",
          "tagPriority": 6,
        },
        {
          "_e": 7,
          "_p": 7168,
          "props": {
            "href": "sync-styles.css",
            "rel": "stylesheet",
          },
          "tag": "link",
          "tagPriority": 6,
        },
        {
          "_e": 3,
          "_p": 3072,
          "props": {
            "href": "modulepreload.js",
            "rel": "modulepreload",
          },
          "tag": "link",
          "tagPriority": 7,
        },
        {
          "_e": 5,
          "_p": 5120,
          "props": {
            "href": "preload.js",
            "rel": "preload",
          },
          "tag": "link",
          "tagPriority": 7,
        },
        {
          "_e": 0,
          "_p": 0,
          "props": {
            "defer": "",
            "src": "defer-script.js",
          },
          "tag": "script",
          "tagPriority": 8,
        },
        {
          "_e": 10,
          "_p": 10240,
          "props": {
            "href": "https://example.com",
            "rel": "dns-prefetch",
          },
          "tag": "link",
          "tagPriority": 9,
        },
        {
          "_e": 11,
          "_p": 11264,
          "props": {
            "href": "https://example.com",
            "rel": "prefetch",
          },
          "tag": "link",
          "tagPriority": 9,
        },
        {
          "_e": 12,
          "_p": 12288,
          "props": {
            "href": "https://example.com",
            "rel": "prerender",
          },
          "tag": "link",
          "tagPriority": 9,
        },
        {
          "_d": "meta:name:description",
          "_e": 13,
          "_p": 13312,
          "props": {
            "content": "description",
            "name": "description",
          },
          "tag": "meta",
        },
      ]
    `)

    const resolvedTags = await head.resolveTags()
    // TITLE
    expect(resolvedTags[0].tag).toEqual('title')
    // PRECONNECT
    expect(resolvedTags[1].tag).toEqual('link')
    expect(resolvedTags[1].props.rel).toEqual('preconnect')
    // ASYNC SCRIPT
    expect(resolvedTags[2].tag).toEqual('script')
    expect(resolvedTags[2].props.async).toEqual('')
    // IMPORTED CSS
    expect(resolvedTags[3].tag).toEqual('style')
    expect(resolvedTags[3].innerHTML).toEqual('@import "imported.css"')
    // SYNC SCRIPT
    expect(resolvedTags[4].tag).toEqual('script')
    expect(resolvedTags[4].props.src).toEqual('sync-script.js')
    // SYNC STYLE
    expect(resolvedTags[5].tag).toEqual('style')
    expect(resolvedTags[5].innerHTML).toEqual('.sync-style { color: red }')
    expect(resolvedTags[6].tag).toEqual('link')
    expect(resolvedTags[6].props.rel).toEqual('stylesheet')
    // PRELOAD
    expect(resolvedTags[7].tag).toEqual('link')
    expect(resolvedTags[7].props.rel).toEqual('modulepreload')
    expect(resolvedTags[8].tag).toEqual('link')
    expect(resolvedTags[8].props.rel).toEqual('preload')
    // DEFER SCRIPT
    expect(resolvedTags[9].tag).toEqual('script')
    expect(resolvedTags[9].props.defer).toEqual('')
    // DNS-PREFETCH
    expect(resolvedTags[10].tag).toEqual('link')
    expect(resolvedTags[10].props.rel).toEqual('dns-prefetch')
    // PREFETCH
    expect(resolvedTags[11].tag).toEqual('link')
    expect(resolvedTags[11].props.rel).toEqual('prefetch')
    // PRERENDER
    expect(resolvedTags[12].tag).toEqual('link')
    expect(resolvedTags[12].props.rel).toEqual('prerender')
    // META
    expect(resolvedTags[13].tag).toEqual('meta')
    expect(resolvedTags[13].props.name).toEqual('description')
  })
})
