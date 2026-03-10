import { describe, expect, it } from 'vitest'
import { useHeadSafe } from '../../../src'
import { renderSSRHead } from '../../../src/server'
import { basicSchema, createServerHeadWithContext } from '../../util'

describe('dom useHeadSafe', () => {
  it('basic', async () => {
    const head = createServerHeadWithContext()

    useHeadSafe(head, basicSchema)

    const ctx = renderSSRHead(head)
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
    const head = createServerHeadWithContext()

    useHeadSafe(head, {
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

    const ctx = renderSSRHead(head)
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

  it('meta charset allows safe', async () => {
    const head = createServerHeadWithContext()

    useHeadSafe(head, {
      meta: [
        {
          charset: 'utf-8',
        },
      ],
    })

    const ctx = renderSSRHead(head)
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

  it('blocks XSS via data-* attribute name injection', async () => {
    const head = createServerHeadWithContext()

    useHeadSafe(head, {
      link: [{
        'rel': 'stylesheet',
        'href': '/valid-stylesheet.css',
        'data-x onload=alert(1) y': 'z',
      }],
    })

    const ctx = renderSSRHead(head)
    expect(ctx.headTags).not.toContain('onload')
    expect(ctx.headTags).toContain('rel="stylesheet"')
    expect(ctx.headTags).toContain('href="/valid-stylesheet.css"')
  })

  it('blocks case-varied javascript: and data: URIs in link href', async () => {
    const head = createServerHeadWithContext()

    useHeadSafe(head, {
      link: [
        { rel: 'stylesheet', href: 'DATA:text/css,body{display:none}' },
        { rel: 'stylesheet', href: 'JAVASCRIPT:alert(1)' },
        { rel: 'stylesheet', href: 'Javascript:alert(1)' },
        { rel: 'stylesheet', href: 'Data:text/css,*{color:red}' },
      ],
    })

    const ctx = renderSSRHead(head)
    expect(ctx.headTags).toBe('')
  })

  it('strips noscript textContent to prevent HTML injection', async () => {
    const head = createServerHeadWithContext()

    useHeadSafe(head, {
      noscript: [{
        textContent: '<img src=x onerror=alert(1)>',
      }],
    })

    const ctx = renderSSRHead(head)
    expect(ctx.headTags).toBe('')
  })

  it('sanitizes script textContent through JSON parse/stringify', async () => {
    const head = createServerHeadWithContext()

    useHeadSafe(head, {
      script: [{
        type: 'application/ld+json',
        textContent: '{"@type": "Organization", "name": "Test"}',
      }],
    })

    const ctx = renderSSRHead(head)
    expect(ctx.headTags).toContain('application/ld+json')
    expect(ctx.headTags).toContain('"@type":"Organization"')
  })

  it('blocks dangerous URIs in imagesrcset', async () => {
    const head = createServerHeadWithContext()

    useHeadSafe(head, {
      link: [
        { rel: 'icon', href: '/ok.png', imagesrcset: 'data:image/svg+xml,<svg onload=alert(1)>' },
      ],
    })

    const ctx = renderSSRHead(head)
    expect(ctx.headTags).not.toContain('data:')
  })

  it('title renders safely', async () => {
    const head = createServerHeadWithContext()

    useHeadSafe(head, {
      title: 'My Safe Page',
    })

    const ctx = renderSSRHead(head)
    expect(ctx.headTags).toContain('<title>My Safe Page</title>')
  })

  it('blocks style textContent (CSS injection)', async () => {
    const head = createServerHeadWithContext()

    useHeadSafe(head, {
      style: [{
        textContent: 'body{display:none}input[value^="a"]{background:url(https://evil.com/a)}',
      }],
    })

    const ctx = renderSSRHead(head)
    expect(ctx.headTags).not.toContain('display:none')
    expect(ctx.headTags).not.toContain('evil.com')
  })

  it('blocks style innerHTML (CSS injection)', async () => {
    const head = createServerHeadWithContext()

    useHeadSafe(head, {
      style: [{
        // @ts-expect-error intentionally invalid
        'innerHTML': 'body { background: url("javascript:alert(1)") }',
        'data-foo': 'bar',
      }],
    })

    const ctx = renderSSRHead(head)
    expect(ctx.headTags).not.toContain('javascript')
    expect(ctx.headTags).not.toContain('background')
  })

  it('blocks script with invalid JSON textContent', async () => {
    const head = createServerHeadWithContext()

    useHeadSafe(head, {
      script: [{
        type: 'application/ld+json',
        textContent: '</script><script>alert(1)</script>',
      }],
    })

    const ctx = renderSSRHead(head)
    expect(ctx.headTags).toBe('')
  })

  it('blocks script with non-json type', async () => {
    const head = createServerHeadWithContext()

    useHeadSafe(head, {
      script: [{
        type: 'text/javascript',
        textContent: 'alert(1)',
      }],
    })

    const ctx = renderSSRHead(head)
    expect(ctx.headTags).toBe('')
  })

  it('meta charset is actually safe', async () => {
    const head = createServerHeadWithContext()

    useHeadSafe(head, {
      meta: [
        {
          charset: 'utf-8"><script>alert("pwned?")</script>',
        },
      ],
    })

    const ctx = renderSSRHead(head)
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
