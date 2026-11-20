import { describe, expect, it } from 'vitest'
import { sampleMemory, summarizeMemory } from './memory'

describe('memory measurements', () => {
  it('awaits work and measures live memory after collection on both sides', async () => {
    let retained = 100
    let temporary = 40
    const sample = await sampleMemory(async () => {
      await Promise.resolve()
      retained += 80
      temporary += 20
    }, {
      gc: () => { temporary = 0 },
      settle: async () => {},
      readMemory: () => ({ heapUsed: retained + temporary, rss: 10_000, external: 200 }),
    })

    expect(sample.before.heapUsed).toBe(100)
    expect(sample.after.heapUsed).toBe(180)
  })

  it('separates heap growth from total live heap, RSS and external memory', () => {
    const metrics = summarizeMemory('ssr', 'SSR', 200, [
      { before: { heapUsed: 100, rss: 5000, external: 200 }, after: { heapUsed: 500, rss: 10_000, external: 600 } },
      { before: { heapUsed: 200, rss: 5000, external: 200 }, after: { heapUsed: 500, rss: 5000, external: 1000 } },
    ])

    expect(metrics.find(metric => metric.id === 'ssr-retained-heap')?.value).toBe(350)
    expect(metrics.find(metric => metric.id === 'ssr-heap-used')?.value).toBe(500)
    expect(metrics.find(metric => metric.id === 'ssr-rss')?.value).toBe(7500)
    expect(metrics.find(metric => metric.id === 'ssr-external')?.value).toBe(800)
  })

  it('preserves negative heap growth', () => {
    const sample = {
      before: { heapUsed: 1000, rss: 5000, external: 200 },
      after: { heapUsed: 500, rss: 5000, external: 200 },
    }
    const metrics = summarizeMemory('csr', 'CSR', 200, [sample, sample])

    expect(metrics.find(metric => metric.id === 'csr-retained-heap')?.value).toBe(-500)
  })

  it.each([0, 1])('rejects %s samples because uncertainty cannot be measured', (count) => {
    const sample = {
      before: { heapUsed: 1000, rss: 5000, external: 200 },
      after: { heapUsed: 500, rss: 5000, external: 200 },
    }
    expect(() => summarizeMemory('csr', 'CSR', 200, Array.from<typeof sample>({ length: count }).fill(sample)))
      .toThrowError('Collect at least two memory samples.')
  })
})
