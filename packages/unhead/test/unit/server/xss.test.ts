import { stringify } from 'devalue'
import { describe, it } from 'vitest'
import { renderSSRHead } from '../../../src/server'
import { createServerHeadWithContext } from '../../util'

describe('xss', () => {
  it('basic', async () => {
    const head = createServerHeadWithContext()

    head.push({
      title: '</title><script>alert(1)</script>',
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`"<title>&lt;&#x2F;title&gt;&lt;script&gt;alert(1)&lt;&#x2F;script&gt;</title>"`)
  })

  it('json devalue', async () => {
    const head = createServerHeadWithContext()

    head.push({
      script: [
        { innerHTML: stringify({ state1: '</scr' + 'ipt>' }) },
      ],
    })

    head.push({
      script: [
        { type: 'application/json', innerHTML: stringify({ state2: '</scr' + 'ipt>' }) },
      ],
    })
    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`
      "<script>[{"state1":1},"\\u003C/script>"]</script>
      <script type="application/json">[{"state2":1},"\\u003C/script>"]</script>"
    `)
  })

  it('title quotes', async () => {
    const head = createServerHeadWithContext()

    head.push({
      title: '"test" times',
      titleTemplate: '%s - myApp',
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`"<title>&quot;test&quot; times - myApp</title>"`)
  })

  it('meta with attribute injection', async () => {
    const head = createServerHeadWithContext()

    head.push({
      meta: [
        { name: 'description" onload="alert(1)', content: 'This is a test' },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`"<meta name="description&quot; onload=&quot;alert(1)" content="This is a test">"`)
  })

  it('script with complex innerHTML', async () => {
    const head = createServerHeadWithContext()

    head.push({
      script: [
        { innerHTML: `const data = { payload: "</script><script>alert('XSS')</script>" };` },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`"<script>const data = { payload: "<\\/script><script>alert('XSS')<\\/script>" };</script>"`)
  })

  it('link with malicious href', async () => {
    const head = createServerHeadWithContext()

    head.push({
      link: [
        { rel: 'stylesheet', href: 'javascript:alert(1)' },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`"<link rel="stylesheet" href="javascript:alert(1)">"`)
  })

  it('style with CSS injection', async () => {
    const head = createServerHeadWithContext()

    head.push({
      style: [
        { innerHTML: `body { background: url('javascript:alert(1)') }` },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`"<style>body { background: url('javascript:alert(1)') }</style>"`)
  })

  it('htmlAttrs with event handlers', async () => {
    const head = createServerHeadWithContext()

    head.push({
      htmlAttrs: {
        // @ts-expect-error untyped
        'onload': 'alert(1)',
        'data-attr': '"><script>alert(1)</script>',
      },
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`""`)
  })

  it('meta with innerHTML (which should not be supported)', async () => {
    const head = createServerHeadWithContext()

    head.push({
      meta: [
        // @ts-expect-error untyped
        { name: 'description', innerHTML: '<script>alert(1)</script>' },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`""`)
  })

  it('base with malicious href', async () => {
    const head = createServerHeadWithContext()

    head.push({
      base: { href: 'javascript:alert(1)' },
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`"<base href="javascript:alert(1)">"`)
  })

  // Additional creative XSS test cases

  it('meta with unicode escape sequence injection', async () => {
    const head = createServerHeadWithContext()

    head.push({
      meta: [
        { name: 'description', content: '\\u003Cscript\\u003Ealert(1)\\u003C/script\\u003E' },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`"<meta name="description" content="\\u003Cscript\\u003Ealert(1)\\u003C/script\\u003E">"`)
  })

  it('script with multi-line template literal injection', async () => {
    const head = createServerHeadWithContext()

    head.push({
      script: [
        {
          innerHTML: `
            const template = \`
              </script>
              <img src=x onerror="alert(1)">
              <script>
            \`;
            console.log(template);
          `,
        },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`
      "<script>
                  const template = \`
                    <\\/script>
                    <img src=x onerror="alert(1)">
                    <script>
                  \`;
                  console.log(template);
                </script>"
    `)
  })

  it('link with data URI containing JS', async () => {
    const head = createServerHeadWithContext()

    head.push({
      link: [
        { rel: 'stylesheet', href: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==' },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`"<link rel="stylesheet" href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">"`)
  })

  it('style with CSS expression', async () => {
    const head = createServerHeadWithContext()

    head.push({
      style: [
        { innerHTML: `body { color: expression(alert(1)) }` },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`"<style>body { color: expression(alert(1)) }</style>"`)
  })

  it('mixing valid and invalid attribute names', async () => {
    const head = createServerHeadWithContext()

    head.push({
      meta: [
        // @ts-expect-error untyped
        { 'name': 'description', 'data-x': 'valid', '</meta><script>alert(1)</script>': 'invalid' },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`""`)
  })

  it('script with null byte insertion', async () => {
    const head = createServerHeadWithContext()

    head.push({
      script: [
        { innerHTML: `console.log("Null byte attack: \\0')</script><script>alert(1)</script>")` },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`"<script>console.log("Null byte attack: \\0')<\\/script><script>alert(1)<\\/script>")</script>"`)
  })

  it('meta with SVG-based XSS', async () => {
    const head = createServerHeadWithContext()

    head.push({
      meta: [
        { name: 'description', content: '<svg><script>alert(1)</script></svg>' },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`"<meta name="description" content="<svg><script>alert(1)</script></svg>">"`)
  })

  it('meta with character encoding tricks', async () => {
    const head = createServerHeadWithContext()

    head.push({
      meta: [
        {
          'http-equiv': 'content-type',
          'content': 'text/html; charset=UTF-7; X-Content-Type-Options: "nosniff"; X-XSS-Protection: "0";',
        },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`"<meta http-equiv="content-type" content="text/html; charset=UTF-7; X-Content-Type-Options: &quot;nosniff&quot;; X-XSS-Protection: &quot;0&quot;;">"`)
  })

  it('meta with emoji obfuscation', async () => {
    const head = createServerHeadWithContext()

    head.push({
      meta: [
        { name: 'keywords', content: '📝➡️<script>alert(1)</script>' },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`"<meta name="keywords" content="📝➡️<script>alert(1)</script>">"`)
  })

  it('meta with tag name bypass using character casing', async () => {
    const head = createServerHeadWithContext()

    head.push({
      meta: [
        { name: 'description', content: '<ScRiPt>alert(1)</ScRiPt>' },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`"<meta name="description" content="<ScRiPt>alert(1)</ScRiPt>">"`)
  })

  it('script with comment-based tag closure bypass', async () => {
    const head = createServerHeadWithContext()

    head.push({
      script: [
        { innerHTML: `console.log("</scr"+"ipt><script>alert(1)</script>")` },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`"<script>console.log("</scr"+"ipt><script>alert(1)<\\/script>")</script>"`)
  })

  it('bodyAttrs with embedded events', async () => {
    const head = createServerHeadWithContext()

    head.push({
      bodyAttrs: {
        'data-custom': `x" onmouseover="alert(1)" data-x="`,
      },
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`""`)
  })

  it('script with mXSS payloads', async () => {
    const head = createServerHeadWithContext()

    head.push({
      script: [
        { innerHTML: `var xss = '<img src="1" onerror="alert(1)" />';` },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`"<script>var xss = '<img src="1" onerror="alert(1)" />';</script>"`)
  })

  it('link attributes with protocol switching vectors', async () => {
    const head = createServerHeadWithContext()

    head.push({
      link: [
        { rel: 'stylesheet', href: '//evil.com/xss.js' },
        { rel: 'stylesheet', href: 'javascript&#58;alert(1)' },
        { rel: 'stylesheet', href: 'vbscript:alert(1)' },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`
      "<link rel="stylesheet" href="//evil.com/xss.js">
      <link rel="stylesheet" href="javascript&#58;alert(1)">
      <link rel="stylesheet" href="vbscript:alert(1)">"
    `)
  })
  it('style tag', async () => {
    // body {color: red;}</style><script>alert('XSS')</script><style>
    const head = createServerHeadWithContext()
    head.push({
      style: [
        { innerHTML: 'body {color: red;}</style><script>alert(\'XSS\')</script><style>' },
        { innerHTML: '} </style><script>alert("XSS Attack Successful")</script><style>{</style>' },
      ],
    })
    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`
      "<style>body {color: red;}<\\/style><script>alert('XSS')</script><style></style>
      <style>} <\\/style><script>alert("XSS Attack Successful")</script><style>{<\\/style></style>"
    `)
  })
})
