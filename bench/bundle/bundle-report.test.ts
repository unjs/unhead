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

describe('streaming bundle report', () => {
  const bootstrap = {
    name: 'Streaming Bootstrap',
    category: 'Streaming',
    size: 12_854,
    gzippedSize: 5_257,
    brotliSize: 4_798,
    baseSize: 12_840,
    baseGzippedSize: 5_250,
    baseBrotliSize: 4_800,
  }

  it('lists changed streaming bundles in the standard summary table', () => {
    const report = renderBundleReport([
      { ...bootstrap, name: 'Vue Streaming Client', gzippedSize: 1_037, baseGzippedSize: 742 },
      bootstrap,
    ])
    const summary = report.split('<details>')[0]

    expect(summary).toContain('| **Vue Streaming Client** | 0.7 kB → 1 kB | 🔴 +0.3 kB (+39.8%) |')
    expect(summary).not.toContain('Streaming Bootstrap')
  })

  it('shows a new streaming bundle in the full breakdown', () => {
    const report = renderBundleReport([{ ...bootstrap, baseSize: 0, baseGzippedSize: 0, baseBrotliSize: 0 }])
    const [summary, breakdown] = report.split('<details>')

    expect(summary).not.toContain('Streaming Bootstrap')
    expect(breakdown).toContain('| Streaming Bootstrap | 5.1 kB | 4.7 kB | 12.6 kB | 🆕 |')
  })
})
