import { describe, expect, it } from 'vitest'
import { parseVitestBenchmarks, renderPerfReport } from './perf-report'

function benchmarkOutput(mean: unknown = 1.25) {
  return {
    testResults: [{
      assertionResults: [{
        benchmarks: [{
          tasks: [{
            name: 'useSeoMetaTransform static calls',
            latency: { mean, rme: 2.5 },
          }],
        }],
      }],
    }],
  }
}

describe('parseVitestBenchmarks', () => {
  it('treats a missing benchmark file as an empty run', () => {
    expect(parseVitestBenchmarks(null)).toEqual({ benches: [] })
  })

  it.each(['1.25', Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid latency %s', (mean) => {
    expect(() => parseVitestBenchmarks(benchmarkOutput(mean)))
      .toThrowError('Invalid Vitest benchmark result')
  })

  it('rejects a report without benchmark results', () => {
    expect(() => parseVitestBenchmarks({ testResults: [] }))
      .toThrowError('Vitest benchmark output contained no results')
  })

  it('converts Vitest 5 latency into performance benches', () => {
    expect(parseVitestBenchmarks(benchmarkOutput())).toEqual({
      benches: [{
        id: 'bundler-transform:useSeoMetaTransform static calls',
        name: 'Bundler: useSeoMetaTransform static calls',
        kind: 'time',
        value: 1.25,
        rme: 2.5,
      }],
    })
  })
})

describe('renderPerfReport allocation noise gate', () => {
  it('keeps allocation changes within the combined RME out of the verdict', () => {
    const report = renderPerfReport(
      {
        benches: [
          { id: 'alloc', name: 'Allocated / render', kind: 'alloc', value: 100_000, rme: 4 },
        ],
      },
      {
        benches: [
          { id: 'alloc', name: 'Allocated / render', kind: 'alloc', value: 112_000, rme: 4 },
        ],
      },
    )

    expect(report).toContain('No significant change')
    expect(report).toContain('~ noise')
    expect(report).not.toContain('slower')
  })

  it('reports allocation changes that exceed the absolute and RME gates', () => {
    const report = renderPerfReport(
      {
        benches: [
          { id: 'alloc', name: 'Allocated / render', kind: 'alloc', value: 100_000, rme: 1 },
        ],
      },
      {
        benches: [
          { id: 'alloc', name: 'Allocated / render', kind: 'alloc', value: 110_000, rme: 1 },
        ],
      },
    )

    expect(report).toContain('1 slower')
    expect(report).toContain('+9.8 KiB (+10.0%)')
  })
})
