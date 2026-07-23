import { renderSSRHead } from '@unhead/ssr'
import { createHead, useHeadSafe } from 'unhead'
import { describe, it } from 'vitest'
import { basicSchema } from '../../fixtures'

describe('dom useHeadSafe', () => {
  it('basic', async () => {
    const head = createHead()

    useHeadSafe(basicSchema)

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": " class="dark"",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset="utf-8">
      <link href="https://cdn.example.com/favicon.ico" rel="icon" type="image/x-icon">",
        "htmlAttrs": " lang="en" dir="ltr"",
      }
    `)
  })

  it('link href', async () => {
    const head = createHead()

    useHeadSafe({
      link: [
        // relative from root
        {
          rel: 'apple-touch-icon',
          sizes: '180x180',
          href: '/icon.png',
        },
        // relative to path
        {
          rel: 'icon',
          href: 'favicon.ico',
        },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<link href="/icon.png" rel="apple-touch-icon" sizes="180x180">
      <link href="favicon.ico" rel="icon">",
        "htmlAttrs": "",
      }
    `)
  })

  it('drops malformed data attribute names', async () => {
    const head = createHead()

    useHeadSafe({
      meta: [
        {
          'name': 'description',
          'content': 'safe',
          'data-safe': 'preserved',
          'data-x onload=alert(1)': 'injected',
        },
      ],
    })

    const { headTags } = await renderSSRHead(head)
    expect(headTags).toContain('data-safe="preserved"')
    expect(headTags).not.toContain('injected')
    expect(headTags).not.toContain('onload')
  })

  it('blocks mixed-case dangerous link protocols', async () => {
    const head = createHead()

    useHeadSafe({
      link: [
        { rel: 'icon', href: 'JaVaScRiPt:alert(1)' },
        { rel: 'stylesheet', href: 'DaTa:text/css,body{display:none}' },
        { rel: 'icon', href: 'https://example.com/favicon.ico' },
      ],
    })

    const { headTags } = await renderSSRHead(head)
    expect(headTags).not.toContain('JaVaScRiPt')
    expect(headTags).not.toContain('DaTa:')
    expect(headTags).toContain('href="https://example.com/favicon.ico"')
  })

  it('blocks entity-obfuscated dangerous link protocols', async () => {
    const head = createHead()

    useHeadSafe({
      link: [
        { rel: 'icon', href: 'javascript&#0000000058;alert(1)' },
        { rel: 'icon', href: 'data&#x000003A;text/html,unsafe' },
        { rel: 'icon', href: '/safe-icon.png' },
      ],
    })

    const { headTags } = await renderSSRHead(head)
    expect(headTags).not.toContain('&#0000000058;')
    expect(headTags).not.toContain('&#x000003A;')
    expect(headTags).toContain('href="/safe-icon.png"')
  })

  it('meta charset allows safe', async () => {
    const head = createHead()

    useHeadSafe({
      meta: [
        {
          charset: 'utf-8',
        },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset="utf-8">",
        "htmlAttrs": "",
      }
    `)
  })

  it('meta charset is actually safe', async () => {
    const head = createHead()

    useHeadSafe({
      meta: [
        {
          charset: 'utf-8"><script>alert("pwned?")</script>',
        },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset="utf-8&quot;><script>alert(&quot;pwned?&quot;)</script>">",
        "htmlAttrs": "",
      }
    `)
  })
})
