import { describe, it } from 'vitest'
import { CapoPlugin, createHead } from 'unhead'

describe('capo', () => {
  it('basic', async () => {
    const head = createHead({
      plugins: [
        CapoPlugin({
          track: true,
        }),
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

    const resolvedTags = await head.resolveTags()
    // TITLE
    expect(resolvedTags[0].tag).toEqual('title')
    // PRECONNECT
    expect(resolvedTags[1].tag).toEqual('link')
    expect(resolvedTags[1].props.rel).toEqual('preconnect')
    // ASYNC SCRIPT
    expect(resolvedTags[2].tag).toEqual('script')
    expect(resolvedTags[2].props.async).toEqual(true)
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
    expect(resolvedTags[9].props.defer).toEqual(true)
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
