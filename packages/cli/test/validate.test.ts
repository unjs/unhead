import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'pathe'
import { describe, expect, it } from 'vitest'
import { validateHtml } from '../src/validate'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = resolve(__dirname, 'fixtures/page.html')

/**
 * `validateHtml` is the shared helper that powers both `unhead validate-html`
 * (file globs) and `unhead validate-url` (live fetch). The fetch-and-redirect
 * plumbing for `validate-url` lives in its command file and is exercised by
 * the CLI smoke test in lint.test.ts; these cases pin the rule output of the
 * helper itself against representative HTML inputs.
 */
describe('validateHtml', () => {
  it('reports rules from a fixture HTML file', async () => {
    const html = await readFile(fixture, 'utf8')
    const result = validateHtml(html, fixture)
    const ids = result.rules.map(r => r.id)

    expect(ids).toContain('non-absolute-canonical')
    expect(ids).toContain('canonical-og-url-mismatch')
    expect(ids).toContain('og-missing-description')
    expect(ids).toContain('missing-description')
  })

  it('flags missing description and og:description on a minimal page', () => {
    const html = `<!doctype html><html><head>
      <title>My Page</title>
      <meta property="og:title" content="My Page" />
    </head><body></body></html>`

    const ids = validateHtml(html, 'inline').rules.map(r => r.id).sort()
    expect(ids).toContain('missing-description')
    expect(ids).toContain('og-missing-description')
  })

  it('flags non-absolute canonical and og:url mismatch on inline HTML', () => {
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
