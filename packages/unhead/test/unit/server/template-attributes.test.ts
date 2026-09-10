import { JSDOM } from 'jsdom'
import { parseAttributes } from 'unhead/parser'
import { createHead, prepareTemplate, transformHtmlTemplate } from 'unhead/server'
import { htmlTagsToHead } from 'unhead/vite'
import { describe, expect, it } from 'vitest'

describe('template attribute values', () => {
  it.each([
    ['&amp;&quot;&apos;&lt;&gt;', '&"\'<>'],
    ['&copy; &NotEqualTilde; &nbsp;', '© ≂̸ \u00A0'],
    ['&#38; &#x26; &#X1F680;', '& & 🚀'],
    ['&#0; &#xD800; &#x110000; &#128;', '� � � €'],
    ['&amp &copy &#38 &#x26', '& © & &'],
    ['?a=1&notit=2&copy=3&unknown;', '?a=1&notit=2&copy=3&unknown;'],
    ['&amp;amp; &amp;quot;', '&amp; &quot;'],
  ])('decodes HTML attribute references once: %s', (encoded, decoded) => {
    expect(parseAttributes(`content="${encoded}"`)).toEqual({ content: decoded })
    expect(parseAttributes(`content='${encoded}'`)).toEqual({ content: decoded })
  })

  it('decodes unquoted values without splitting decoded whitespace', () => {
    expect(parseAttributes('content=A&#32;B&amp;C disabled')).toEqual({ content: 'A B&C', disabled: '' })
  })

  for (const prepared of [false, true]) {
    it(`preserves template attributes, prepared=${prepared}`, () => {
      const html = '<html data-owner="A&amp;B"><head><link rel="stylesheet" href="/app.css?a=1&amp;b=2"><meta name="description" content="A &quot;quote&quot; &amp; B &#x1F680; &copy;"></head><body data-owner="C&#38;D" data-literal="&amp;quot;"></body></html>'
      const result = transformHtmlTemplate(createHead({ disableDefaults: true }), prepared ? prepareTemplate(html) : html)
      const document = new JSDOM(result).window.document

      expect({
        href: document.querySelector('link')?.getAttribute('href'),
        description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
        htmlOwner: document.documentElement.getAttribute('data-owner'),
        bodyOwner: document.body.getAttribute('data-owner'),
        literal: document.body.getAttribute('data-literal'),
      }).toEqual({
        href: '/app.css?a=1&b=2',
        description: 'A "quote" & B 🚀 ©',
        htmlOwner: 'A&B',
        bodyOwner: 'C&D',
        literal: '&quot;',
      })
    })

    it(`deduplicates a template URL and a raw Vite descriptor URL, prepared=${prepared}`, () => {
      const html = '<html><head><link rel="modulepreload" href="/app.js?a=1&amp;b=2"></head><body></body></html>'
      const head = createHead({ disableDefaults: true })
      head.push(htmlTagsToHead([{ tag: 'link', attrs: { rel: 'modulepreload', href: '/app.js?a=1&b=2' } }]))
      const result = transformHtmlTemplate(head, prepared ? prepareTemplate(html) : html)
      const document = new JSDOM(result).window.document

      expect(Array.from(document.querySelectorAll('link[rel="modulepreload"]'), link => link.getAttribute('href')))
        .toEqual(['/app.js?a=1&b=2'])
    })
  }
})
