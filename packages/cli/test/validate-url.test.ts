import { describe, expect, it } from 'vitest'
import { validateHtml } from '../src/validate'

describe('validateHtml', () => {
  it('flags missing description and og:description on a minimal page', () => {
    const html = `<!doctype html><html><head>
      <title>My Page</title>
      <meta property="og:title" content="My Page" />
    </head><body></body></html>`

    const ids = validateHtml(html, 'inline').rules.map(r => r.id).sort()
    expect(ids).toContain('missing-description')
    expect(ids).toContain('og-missing-description')
  })

  it('flags non-absolute canonical and og:url mismatch', () => {
    const html = `<!doctype html><html><head>
      <title>x</title>
      <meta name="description" content="d" />
      <link rel="canonical" href="/a" />
      <meta property="og:url" content="https://example.com/b" />
      <meta property="og:title" content="x" />
      <meta property="og:description" content="d" />
    </head></html>`

    const ids = validateHtml(html, 'inline').rules.map(r => r.id)
    expect(ids).toContain('non-absolute-canonical')
    expect(ids).toContain('canonical-og-url-mismatch')
  })
})
