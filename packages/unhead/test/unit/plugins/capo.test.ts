import { describe, it } from 'vitest'
import { createClientHeadWithContext } from '../../util'

describe('capo', () => {
  it('basic', async () => {
    const head = createClientHeadWithContext()
    head.push({
      script: [{
        defer: true,
        src: 'defer-script.js',
      }],
    })
    head.push({
      script: [{
        src: 'sync-script.js',
      }],
    })
    head.push({
      style: [
        '.sync-style { color: red }',
      ],
    })
    head.push({
      link: [{
        rel: 'modulepreload',
        href: 'modulepreload.js',
      }],
    })
    head.push({
      script: [{
        src: 'async-script.js',
        async: true,
      }],
    })
    head.push({
      link: [{
        rel: 'preload',
        href: 'preload.js',
      }],
    })
    head.push({
      style: [
        '@import "imported.css"',
      ],
    })
    head.push({
      link: [{
        rel: 'stylesheet',
        href: 'sync-styles.css',
      }],
    })
    head.push({
      title: 'title',
    })
    // preconnect
    head.push({
      link: [{
        rel: 'preconnect',
        href: 'https://example.com',
      }],
    })
    // dns-prefetch
    head.push({
      link: [{
        rel: 'dns-prefetch',
        href: 'https://example.com',
      }],
    })
    // prefetch
    head.push({
      link: [{
        rel: 'prefetch',
        href: 'https://example.com',
      }],
    })
    // prerender
    head.push({
      link: [{
        rel: 'prerender',
        href: 'https://example.com',
      }],
    })
    // meta
    head.push({
      meta: [{
        name: 'description',
        content: 'description',
      }],
    })
    head.push({
      meta: [{
        name: 'viewport',
        content: 'width=device-width, initial-scale=1.0',
      }],
    })

    const resolvedTags = await head.resolveTags()
    // VIEWPORT
    expect(resolvedTags[0].tag).toEqual('meta')
    expect(resolvedTags[0].props.name).toEqual('viewport')
    // TITLE
    expect(resolvedTags[1].tag).toEqual('title')
    // PRECONNECT
    expect(resolvedTags[2].tag).toEqual('link')
    expect(resolvedTags[2].props.rel).toEqual('preconnect')
    // ASYNC SCRIPT
    expect(resolvedTags[3].tag).toEqual('script')
    expect(resolvedTags[3].props.async).toEqual(true)
    // IMPORTED CSS
    expect(resolvedTags[4].tag).toEqual('style')
    expect(resolvedTags[4].innerHTML).toEqual('@import "imported.css"')
    // SYNC SCRIPT
    expect(resolvedTags[5].tag).toEqual('script')
    expect(resolvedTags[5].props.src).toEqual('sync-script.js')
    // SYNC STYLE
    expect(resolvedTags[6].tag).toEqual('style')
    expect(resolvedTags[6].innerHTML).toEqual('.sync-style { color: red }')
    expect(resolvedTags[7].tag).toEqual('link')
    expect(resolvedTags[7].props.rel).toEqual('stylesheet')
    // PRELOAD
    expect(resolvedTags[8].tag).toEqual('link')
    expect(resolvedTags[8].props.rel).toEqual('modulepreload')
    expect(resolvedTags[9].tag).toEqual('link')
    expect(resolvedTags[9].props.rel).toEqual('preload')
    // DEFER SCRIPT
    expect(resolvedTags[10].tag).toEqual('script')
    expect(resolvedTags[10].props.defer).toEqual(true)
    // DNS-PREFETCH
    expect(resolvedTags[11].tag).toEqual('link')
    expect(resolvedTags[11].props.rel).toEqual('dns-prefetch')
    // PREFETCH
    expect(resolvedTags[12].tag).toEqual('link')
    expect(resolvedTags[12].props.rel).toEqual('prefetch')
    // PRERENDER
    expect(resolvedTags[13].tag).toEqual('link')
    expect(resolvedTags[13].props.rel).toEqual('prerender')
    // META
    expect(resolvedTags[14].tag).toEqual('meta')
    expect(resolvedTags[14].props.name).toEqual('description')
  })
})
