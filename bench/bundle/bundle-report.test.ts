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
  it.each([
    [5_250, 4_800, '| Streaming Bootstrap | 5,250 B → 5,257 B | +7 B | 4,800 B → 4,798 B | −2 B |'],
    [0, 0, '| Streaming Bootstrap | Unavailable → 5,257 B | — | Unavailable → 4,798 B | — |'],
  ])('reports exact byte counts with baseline %s gzip and %s Brotli', (baseGzippedSize, baseBrotliSize, row) => {
    const report = renderBundleReport([{
      name: 'Streaming Bootstrap',
      category: 'Streaming',
      size: 12_854,
      gzippedSize: 5_257,
      brotliSize: 4_798,
      baseSize: baseGzippedSize ? 12_840 : 0,
      baseGzippedSize,
      baseBrotliSize,
    }])

    expect(report.split('<details>')[0]).toContain(row)
  })
})
