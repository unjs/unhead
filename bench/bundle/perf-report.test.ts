import { describe, expect, it } from 'vitest'
import { parseVitestBenchmarks, renderPerfReport } from './perf-report'

describe('parseVitestBenchmarks', () => {
  it('treats a missing benchmark file as an empty run', () => {
    expect(parseVitestBenchmarks(null)).toEqual({ benches: [] })
  })

  it('rejects malformed benchmark output', () => {
    expect(() => parseVitestBenchmarks({
      files: [{
        groups: [{
          benchmarks: [{
            name: 'useSeoMetaTransform static calls',
            mean: '1.25',
            rme: 2.5,
          }],
        }],
      }],
    })).toThrowError('Invalid Vitest benchmark result')
  })

  it('converts transform benchmark output into performance benches', () => {
    expect(parseVitestBenchmarks({
      files: [{
        groups: [{
          benchmarks: [{
            name: 'useSeoMetaTransform static calls',
            mean: 1.25,
            rme: 2.5,
          }],
        }],
      }],
    })).toEqual({
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
  it('keeps allocation changes within the combined 95% confidence interval out of the verdict', () => {
    const report = renderPerfReport(
      {
        benches: [
          { id: 'alloc', name: 'Allocated / render', kind: 'alloc', value: 100_000, rme: 8 },
        ],
      },
      {
        benches: [
          { id: 'alloc', name: 'Allocated / render', kind: 'alloc', value: 108_000, rme: 8 },
        ],
      },
    )

    expect(report).toContain('No significant change')
    expect(report).toContain('~ +8.0%')
    expect(report).not.toContain('slower')
  })

  it('does not double an RME that already represents a 95% confidence interval', () => {
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

    expect(report).toContain('1 slower')
    expect(report).toContain('+11.7 KiB (+12.0%)')
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
