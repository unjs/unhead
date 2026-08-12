import { describe, expect, it } from 'vitest'
import { processTemplateParams } from '../../src/utils/templateParams'

describe('processTemplateParams', () => {
  it('preserves encoded percent sequences while resolving template tokens', () => {
    expect(processTemplateParams('https://example.com/a%20b/%siteName', { siteName: 'Unhead' }))
      .toBe('https://example.com/a%20b/Unhead')
  })

  it('resolves tokens that are not encoded percent sequences', () => {
    expect(processTemplateParams('%s %separator %siteName', {
      pageTitle: 'Page',
      siteName: 'Unhead',
    }, '|')).toBe('Page | Unhead')
  })
})
