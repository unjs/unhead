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

  it('keeps every result from a grouped comparison', () => {
    const output = benchmarkOutput()
    output.testResults[0].assertionResults[0].benchmarks[0].tasks.push({
      name: 'minifyTransform inline script/style',
      latency: { mean: 0.5, rme: 1 },
    })
    expect(parseVitestBenchmarks(output).benches.map(bench => [bench.name, bench.value])).toEqual([
      ['Bundler: useSeoMetaTransform static calls', 1.25],
      ['Bundler: minifyTransform inline script/style', 0.5],
    ])
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

describe('renderPerfReport sections', () => {
  it('gives CPU work and memory measurements separate verdicts and tables', () => {
    const report = renderPerfReport(
      { benches: [
        { id: 'cpu', name: 'SSR CPU time', kind: 'time', value: 1 },
        { id: 'alloc', name: 'SSR allocated bytes', kind: 'alloc', value: 10_000 },
        { id: 'heap', name: 'CSR retained heap', kind: 'memory', value: 20_000, informational: true },
        { id: 'mutations', name: 'CSR DOM mutations', kind: 'count', category: 'cpu', value: 38 },
        { id: 'detached', name: 'CSR detached elements', kind: 'count', category: 'memory', value: 10 },
      ] },
      { benches: [
        { id: 'cpu', name: 'SSR CPU time', kind: 'time', value: 2 },
        { id: 'alloc', name: 'SSR allocated bytes', kind: 'alloc', value: 5000 },
        { id: 'heap', name: 'CSR retained heap', kind: 'memory', value: 10_000, informational: true },
        { id: 'mutations', name: 'CSR DOM mutations', kind: 'count', category: 'cpu', value: 38 },
        { id: 'detached', name: 'CSR detached elements', kind: 'count', category: 'memory', value: 0 },
      ] },
    )
    const [cpu, memory] = report.split('### ⚡ Perf - Memory')

    expect(cpu).toContain('### ⚡ Perf - CPU')
    expect(cpu).toContain('1 slower')
    expect(cpu).toContain('SSR CPU time')
    expect(cpu).toContain('CSR DOM mutations')
    expect(cpu).not.toContain('SSR allocated bytes')
    expect(cpu).not.toContain('CSR detached elements')
    expect(cpu).not.toContain('CSR retained heap')
    expect(memory).toContain('2 lower')
    expect(memory).toContain('SSR allocated bytes')
    expect(memory).toContain('CSR detached elements')
    expect(memory).toContain('CSR retained heap')
    expect(memory).not.toContain('SSR CPU time')
    expect(memory).not.toContain('CSR DOM mutations')
  })

  it('does not add an empty CPU section to a memory-only report', () => {
    const report = renderPerfReport(null, {
      benches: [{ id: 'heap', name: 'Retained heap', kind: 'memory', value: 1024, informational: true }],
    })

    expect(report).toContain('Perf - Memory')
    expect(report).not.toContain('Perf - CPU')
  })

  it('does not add memory notes to a CPU-only report', () => {
    const report = renderPerfReport(null, {
      benches: [{ id: 'cpu', name: 'CPU time', kind: 'time', value: 1 }],
    })

    expect(report).toContain('Perf - CPU')
    expect(report).not.toContain('Perf - Memory')
    expect(report).not.toContain('jsdom')
  })
})

describe('renderPerfReport allocation noise gate', () => {
  it('shows both retained heap values even when the metric is informational', () => {
    const report = renderPerfReport(
      { benches: [{ id: 'heap', name: 'CSR retained heap', kind: 'memory', value: 2_048_000, rme: 5, informational: true }] },
      { benches: [{ id: 'heap', name: 'CSR retained heap', kind: 'memory', value: 102_400, rme: 100, informational: true }] },
    )

    expect(report).toContain('| Benchmark | Base | PR |')
    expect(report).toContain('| CSR retained heap | 1.95 MiB | 100 KiB |')
    expect(report).toContain('ℹ️ -95.0%')
    expect(report).toContain('No significant change')
    const details = report.match(/<details>[\s\S]*?<\/details>/)?.[0]
    expect(details).toContain('RSS includes runtime overhead.')
  })

  it.each([
    { value: 2048, expected: 'ℹ️ +2 KiB' },
    { value: -2_097_152, expected: 'ℹ️ -2 MiB' },
  ])('shows an absolute memory change from zero: $expected', ({ value, expected }) => {
    const report = renderPerfReport(
      { benches: [{ id: 'heap', name: 'Retained heap', kind: 'memory', value: 0, informational: true }] },
      { benches: [{ id: 'heap', name: 'Retained heap', kind: 'memory', value, informational: true }] },
    )

    expect(report).toContain(expected)
    expect(report).not.toContain('-0.0%')
  })

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

    expect(report).toContain('1 higher')
    expect(report).toContain('+9.8 KiB (+10.0%)')
  })
})
