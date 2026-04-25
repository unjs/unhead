import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'pathe'
import { describe, expect, it } from 'vitest'
import { validateHtml } from '../src/validate'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = resolve(__dirname, 'fixtures/page.html')

describe('validate-html', () => {
  it('reports rules from a fixture HTML file', async () => {
    const html = await readFile(fixture, 'utf8')
    const result = validateHtml(html, fixture)
    const ids = result.rules.map(r => r.id)

    expect(ids).toContain('non-absolute-canonical')
    expect(ids).toContain('canonical-og-url-mismatch')
    expect(ids).toContain('og-missing-description')
    expect(ids).toContain('missing-description')
  })
})
