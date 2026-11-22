import { describe, expect, it } from 'vitest'
import { renderBundleReport } from './bundle-report'

describe('nuxt fixture entry bundle report', () => {
  it.each([
    [36_840, 36_777, '| Nuxt fixture entry (Brotli) | 36,840 B | 36,777 B | −63 B |'],
    [36_777, 36_840, '| Nuxt fixture entry (Brotli) | 36,777 B | 36,840 B | +63 B |'],
    [36_840, 36_840, '| Nuxt fixture entry (Brotli) | 36,840 B | 36,840 B | 0 B |'],
    [null, 36_840, '| Nuxt fixture entry (Brotli) | Unavailable | 36,840 B | — |'],
  ])('reports %s before and %s after', (before, after, row) => {
    const report = renderBundleReport([], { before, after })

    expect(report.split('<details>')[0]).toContain(row)
  })
})
