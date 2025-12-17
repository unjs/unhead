import { describe, expect, it } from 'vitest'
import { extractUnheadInputFromHtml } from '../../../src/server/util/extractUnheadInputFromHtml'

describe('extractUnheadInputFromHtml', () => {
  it('should handle data-vue-ssr-id attribute correctly', () => {
    const html = `
      <html>
        <head>
          <style data-vue-ssr-id="12345678">
            .test { color: red; }
          </style>
        </head>
        <body>
        </body>
      </html>
    `

    const result = extractUnheadInputFromHtml(html)

    // The bug causes data-vue-ssr-id to be split into data-vue="true" and ssr-id="12345678"
    // This test should fail with the current implementation
    expect(result.input.style).toBeDefined()
    expect(result.input.style?.[0]).toEqual({
      'data-vue-ssr-id': '12345678',
      'textContent': '\n            .test { color: red; }\n          ',
    })
  })

  it('should handle multiple hyphenated attributes', () => {
    const html = `
      <html>
        <head>
          <meta data-custom-attr="value1" another-hyphenated-attr="value2" />
        </head>
        <body>
        </body>
      </html>
    `

    const result = extractUnheadInputFromHtml(html)

    expect(result.input.meta).toBeDefined()
    expect(result.input.meta?.[0]).toEqual({
      'data-custom-attr': 'value1',
      'another-hyphenated-attr': 'value2',
    })
  })

  it('should handle attributes with multiple hyphens', () => {
    const html = `
      <html>
        <head>
          <link data-vue-ssr-id="abc123" rel="stylesheet" href="/style.css" />
        </head>
        <body>
        </body>
      </html>
    `

    const result = extractUnheadInputFromHtml(html)

    expect(result.input.link).toBeDefined()
    expect(result.input.link?.[0]).toEqual({
      'data-vue-ssr-id': 'abc123',
      'rel': 'stylesheet',
      'href': '/style.css',
    })
  })
})
