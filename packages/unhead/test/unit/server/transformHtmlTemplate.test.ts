import { describe, expect, it } from 'vitest'
import { transformHtmlTemplate, transformHtmlTemplateRaw } from '../../../src/server/transformHtmlTemplate'
import { createServerHeadWithContext } from '../../util'

describe('transformHtmlTemplate edge cases', () => {
  describe('empty and null inputs', () => {
    it('handles empty HTML string', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const result = await transformHtmlTemplate(head, '')
      expect(result).toBe('')
    })

    it('handles HTML with no head or body tags', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const result = await transformHtmlTemplate(head, '<div>Content</div>')
      expect(result).toBe('<div>Content</div>')
    })

    it('handles HTML with only whitespace', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const result = await transformHtmlTemplate(head, '   \n\t   ')
      expect(result).toBe('   \n\t   ')
    })
  })

  describe('malformed HTML', () => {
    it('handles unclosed tags', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const html = '<html><head><title>Original</head><body>Content'
      const result = await transformHtmlTemplate(head, html)
      expect(result).toContain('<title>Test Title</title>')
      // The parser extracts existing title "Original" from the template
      expect(result).toContain('Original')
    })

    it('handles mismatched tags', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const html = '<html><head></title><body>Content</div>'
      const result = await transformHtmlTemplate(head, html)
      // No proper head structure, so no head injection occurs
      expect(result).toBe('<html><head></title><body>Content</div>')
    })

    it('handles incomplete tags', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const html = '<html><head><meta charset='
      const result = await transformHtmlTemplate(head, html)
      // Incomplete HTML is handled gracefully
      expect(result).toContain('<html><head><meta charset=')
    })

    it('handles tags with missing closing brackets', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const html = '<html><head<body>Content</body></html>'
      const result = await transformHtmlTemplate(head, html)
      // Malformed HTML is preserved as-is
      expect(result).toBe('<html><head<body>Content</body></html>')
    })
  })

  describe('complex nested structures', () => {
    it('handles deeply nested HTML', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const html = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              .nested { color: red; }
            </style>
          </head>
          <body>
            <div>
              <div>
                <div>
                  <span>Deep content</span>
                </div>
              </div>
            </div>
          </body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      expect(result).toContain('<title>Test Title</title>')
      expect(result).toContain('Deep content')
    })

    it('handles multiple head sections (invalid but should work)', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const html = `
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <head>
            <title>Second Head</title>
          </head>
          <body>Content</body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      expect(result).toContain('<title>Test Title</title>')
    })

    it('handles script tags with complex content', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const html = `
        <html>
          <head>
            <script>
              function test() {
                if (x < 10 && y > 5) {
                  return "<div>Not a real tag</div>";
                }
              }
            </script>
          </head>
          <body>Content</body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      expect(result).toContain('<title>Test Title</title>')
      expect(result).toContain('Content')
    })

    it('handles style tags with complex CSS', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const html = `
        <html>
          <head>
            <style>
              @media (max-width: 768px) {
                .class::before {
                  content: "<not a tag>";
                }
              }
            </style>
          </head>
          <body>Content</body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      expect(result).toContain('<title>Test Title</title>')
    })
  })

  describe('special characters and encoding', () => {
    it('handles HTML entities in content', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test &amp; Title' })

      const html = `
        <html>
          <head>
            <title>Original &lt;&gt; Title</title>
          </head>
          <body>&amp; Content &lt;&gt;</body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      expect(result).toContain('<title>Test &amp;amp; Title</title>')
      expect(result).toContain('&amp; Content &lt;&gt;')
    })

    it('handles Unicode characters', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test 中文 🚀 Title' })

      const html = `
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body>Content with 中文 and 🚀</body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      expect(result).toContain('<title>Test 中文 🚀 Title</title>')
      expect(result).toContain('Content with 中文 and 🚀')
    })

    it('handles quotes in attributes', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const html = `
        <html>
          <head>
            <meta name="description" content='Content with "quotes" and &apos;apostrophes&apos;'>
          </head>
          <body>Content</body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      expect(result).toContain('<title>Test Title</title>')
    })

    it('handles newlines and whitespace in attributes', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const html = `
        <html>
          <head>
            <meta
              name="description"
              content="Multi-line
                       content
                       with spaces">
          </head>
          <body>Content</body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      expect(result).toContain('<title>Test Title</title>')
    })
  })

  describe('comment and doctype handling', () => {
    it('handles HTML comments', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const html = `
        <!-- This is a comment -->
        <html>
          <head>
            <!-- Head comment -->
            <meta charset="utf-8">
            <!-- Another comment -->
          </head>
          <body>
            <!-- Body comment -->
            Content
          </body>
        </html>
        <!-- Final comment -->
      `

      const result = await transformHtmlTemplate(head, html)
      expect(result).toContain('<!-- This is a comment -->')
      expect(result).toContain('<title>Test Title</title>')
      expect(result).toContain('<!-- Final comment -->')
    })

    it('handles DOCTYPE declarations', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body>Content</body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      expect(result).toContain('<!DOCTYPE html>')
      expect(result).toContain('<title>Test Title</title>')
    })

    it('handles malformed comments', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const html = `
        <!-- Unclosed comment
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body>Content</body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      // Malformed comment prevents proper parsing
      expect(result).toContain('<!-- Unclosed comment')
    })
  })

  describe('edge cases with existing head content', () => {
    it('extracts and replaces existing title', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'New Title' })

      const html = `
        <html>
          <head>
            <title>Old Title</title>
            <meta charset="utf-8">
          </head>
          <body>Content</body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      expect(result).toContain('<title>New Title</title>')
      expect(result).not.toContain('Old Title')
    })

    it('handles multiple title tags', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Final Title' })

      const html = `
        <html>
          <head>
            <title>First Title</title>
            <title>Second Title</title>
            <meta charset="utf-8">
          </head>
          <body>Content</body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      expect(result).toContain('<title>Final Title</title>')
      expect(result).not.toContain('First Title')
      expect(result).not.toContain('Second Title')
    })

    it('handles self-closing tags in head', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const html = `
        <html>
          <head>
            <meta charset="utf-8"/>
            <link rel="icon" href="/favicon.ico"/>
            <meta name="viewport" content="width=device-width"/>
          </head>
          <body>Content</body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      expect(result).toContain('<title>Test Title</title>')
    })
  })

  describe('attribute extraction edge cases', () => {
    it('handles malformed attributes', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const html = `
        <html lang="en" class=test id=>
          <head>
            <meta charset="utf-8">
          </head>
          <body data-theme="dark" class=>Content</body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      expect(result).toContain('<title>Test Title</title>')
    })

    it('handles attributes with no values', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const html = `
        <html disabled checked>
          <head>
            <meta charset="utf-8">
          </head>
          <body hidden>Content</body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      expect(result).toContain('<title>Test Title</title>')
    })

    it('handles escaped quotes in attributes', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const html = `
        <html data-test="value with \\"escaped\\" quotes">
          <head>
            <meta name="description" content="Content with \\"quotes\\"">
          </head>
          <body>Content</body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      expect(result).toContain('<title>Test Title</title>')
    })
  })

  describe('transformHtmlTemplateRaw edge cases', () => {
    it('handles empty HTML with raw transform', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const result = await transformHtmlTemplateRaw(head, '')
      expect(result).toBe('')
    })

    it('preserves existing head content with raw transform', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'New Title' })

      const html = `
        <html>
          <head>
            <title>Existing Title</title>
            <meta charset="utf-8">
          </head>
          <body>Content</body>
        </html>
      `

      const result = await transformHtmlTemplateRaw(head, html)
      expect(result).toContain('<title>New Title</title>')
      expect(result).toContain('<title>Existing Title</title>')
    })

    it('handles malformed HTML with raw transform', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      const html = '<html><head><body>Content'
      const result = await transformHtmlTemplateRaw(head, html)
      // Raw transform with malformed HTML
      expect(result).toBe('<html><head><body>Content')
    })
  })

  describe('large content handling', () => {
    it('handles very large HTML documents', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      // Create a large HTML document
      const largeContent = 'x'.repeat(100000)
      const html = `
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body>
            <div>${largeContent}</div>
          </body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      expect(result).toContain('<title>Test Title</title>')
      expect(result).toContain(largeContent)
    })

    it('handles many repeated elements', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test Title' })

      // Create many meta tags
      const manyMetas = Array.from({ length: 1000 }, (_, i) =>
        `<meta name="test-${i}" content="value-${i}">`).join('\n')

      const html = `
        <html>
          <head>
            ${manyMetas}
          </head>
          <body>Content</body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      expect(result).toContain('<title>Test Title</title>')
    })
  })

  describe('security considerations', () => {
    it('handles potential XSS in title extraction', async () => {
      const head = createServerHeadWithContext()

      const html = `
        <html>
          <head>
            <title><script>alert('xss')</script></title>
          </head>
          <body>Content</body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      // The extracted title content is HTML-escaped when rendered
      expect(result).toContain('&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;')
    })

    it('handles potential XSS in script content extraction', async () => {
      const head = createServerHeadWithContext()

      const html = `
        <html>
          <head>
            <script>
              var malicious = "</script><script>alert('xss')</script>";
            </script>
          </head>
          <body>Content</body>
        </html>
      `

      const result = await transformHtmlTemplate(head, html)
      expect(result).toBeDefined()
    })
  })
})
