import { describe, expect, it } from 'vitest'
import { renderPerfReport } from './perf-report'

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
