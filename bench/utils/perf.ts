export interface MemoryStats {
  rss: number
  heapTotal: number
  heapUsed: number
  external: number
  arrayBuffers: number
}

export interface MemoryMeasure {
  name: string
  runs: number
  durationMs: number
  before: MemoryStats
  after: MemoryStats
  delta: MemoryStats
}

export function forceGC() {
  ;(globalThis as any).gc?.()
}

export function readMemoryStats(): MemoryStats {
  return process.memoryUsage()
}

export function diffMemoryStats(after: MemoryStats, before: MemoryStats): MemoryStats {
  return {
    rss: after.rss - before.rss,
    heapTotal: after.heapTotal - before.heapTotal,
    heapUsed: after.heapUsed - before.heapUsed,
    external: after.external - before.external,
    arrayBuffers: after.arrayBuffers - before.arrayBuffers,
  }
}

export async function measureMemory(
  name: string,
  fn: () => void | Promise<void>,
  options: { warmup?: number, runs?: number } = {},
): Promise<MemoryMeasure> {
  const warmup = options.warmup ?? 5
  const runs = options.runs ?? 50
  for (let i = 0; i < warmup; i++) await fn()
  forceGC()
  const before = readMemoryStats()
  const start = performance.now()
  for (let i = 0; i < runs; i++) await fn()
  forceGC()
  const after = readMemoryStats()
  return {
    name,
    runs,
    durationMs: performance.now() - start,
    before,
    after,
    delta: diffMemoryStats(after, before),
  }
}

export function formatBytes(bytes: number) {
  const sign = bytes < 0 ? '-' : ''
  const abs = Math.abs(bytes)
  if (abs < 1024)
    return `${bytes} B`
  return `${sign}${Math.round(abs / 102.4) / 10} KiB`
}
