import type { PerfBench } from './bundle/perf-report'

export interface MemorySnapshot {
  heapUsed: number
  rss: number
  external: number
}

interface MemorySample {
  before: MemorySnapshot
  after: MemorySnapshot
}

export async function sampleMemory(
  run: () => void | Promise<void>,
  dependencies: { gc: () => void, settle: () => Promise<void>, readMemory: () => MemorySnapshot },
): Promise<MemorySample> {
  await dependencies.settle()
  dependencies.gc()
  dependencies.gc()
  const before = dependencies.readMemory()
  await run()
  await dependencies.settle()
  dependencies.gc()
  dependencies.gc()
  return { before, after: dependencies.readMemory() }
}

export function summarizeMemory(id: string, label: string, runs: number, samples: MemorySample[], unit = 'operations'): PerfBench[] {
  if (samples.length < 2)
    throw new TypeError('Collect at least two memory samples.')

  const metric = (suffix: string, name: string, values: number[]): PerfBench => {
    const value = values.reduce((sum, sample) => sum + sample, 0) / values.length
    const variance = values.reduce((sum, sample) => sum + (sample - value) ** 2, 0) / (values.length - 1)
    const error = 1.96 * Math.sqrt(variance / values.length)
    return {
      id: `${id}-${suffix}`,
      name: `${label} ${name}`,
      kind: 'memory',
      value,
      rme: value === 0 ? undefined : error / Math.abs(value) * 100,
      runs,
      informational: true,
    }
  }

  return [
    metric('retained-heap', `retained heap / ${runs} ${unit}`, samples.map(sample => sample.after.heapUsed - sample.before.heapUsed)),
    metric('heap-used', 'heap used after GC', samples.map(sample => sample.after.heapUsed)),
    metric('rss', 'process RSS after GC', samples.map(sample => sample.after.rss)),
    metric('external', 'external memory after GC', samples.map(sample => sample.after.external)),
  ]
}
