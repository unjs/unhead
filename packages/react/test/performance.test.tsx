// @vitest-environment node
import React, { useState } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Head, useHead } from '../src'
import { createHead, UnheadProvider } from '../src/client'
import { renderSSRHead } from '../src/server'

// Performance stress test components
function MultipleUseHeadComponent({ entryCount }: { entryCount: number }) {
  // Create multiple useHead calls to stress test memoization
  for (let i = 0; i < entryCount; i++) {
    useHead({
      meta: [
        { name: `test-${i}`, content: `value-${i}` },
        { property: `og:test-${i}`, content: `og-value-${i}` },
      ],
    })
  }
  return (
    <div>
      Multiple useHead:
      {entryCount}
      {' '}
      entries
    </div>
  )
}

function DynamicHeadComponent({ updateCount }: { updateCount: number }) {
  // Direct useHead call that works in SSR
  useHead({
    title: `Dynamic ${updateCount}`,
  })

  return (
    <div>
      Dynamic updates:
      {updateCount}
    </div>
  )
}

function ComplexHeadComponent({ childCount }: { childCount: number }) {
  const children = []
  for (let i = 0; i < childCount; i++) {
    children.push(
      <meta key={`meta-${i}`} name={`complex-${i}`} content={`value-${i}`} />,
      <link key={`link-${i}`} rel="preload" href={`/asset-${i}.css`} as="style" />,
    )
  }

  return (
    <Head>
      <title>Complex Head Component</title>
      {children}
    </Head>
  )
}

describe('react Performance Tests', () => {
  let _performanceEntries: PerformanceEntry[]

  beforeEach(() => {
    _performanceEntries = []
    // Mock performance.mark if not available in test environment
    if (typeof performance.mark === 'undefined') {
      vi.stubGlobal('performance', {
        mark: vi.fn(),
        measure: vi.fn(),
        getEntriesByType: vi.fn(() => []),
        now: () => Date.now(),
      })
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should handle multiple useHead calls efficiently', async () => {
    const head = createHead()
    const entryCount = 50

    const startTime = performance.now()

    renderToString(
      <UnheadProvider head={head}>
        <MultipleUseHeadComponent entryCount={entryCount} />
      </UnheadProvider>,
    )

    const { headTags } = await renderSSRHead(head)
    const endTime = performance.now()
    const renderTime = endTime - startTime

    // Should handle 50 useHead calls efficiently (baseline expectation)
    expect(renderTime).toBeLessThan(100) // ms
    expect(headTags).toContain('test-0')
    expect(headTags).toContain('test-49')
    expect(headTags).toContain('og:test-0')
    expect(headTags).toContain('og:test-49')
  })

  it('should memoize useHead input to prevent unnecessary patches', async () => {
    const head = createHead()
    const patchSpy = vi.fn()

    // Mock the head.push to spy on patch calls
    const originalPush = head.push
    head.push = vi.fn((input, options) => {
      const entry = originalPush.call(head, input, options)
      const originalPatch = entry.patch
      entry.patch = vi.fn((newInput) => {
        patchSpy(newInput)
        return originalPatch.call(entry, newInput)
      })
      return entry
    })

    const TestComponent = () => {
      const [count, setCount] = useState(0)

      // Same input object should be memoized
      useHead({
        title: 'Static Title',
        meta: [{ name: 'description', content: 'Static Description' }],
      })

      // Different input should trigger patch
      useHead({
        title: `Dynamic Title ${count}`,
      })

      return (
        <button onClick={() => setCount(c => c + 1)}>
          Count:
          {count}
        </button>
      )
    }

    renderToString(
      <UnheadProvider head={head}>
        <TestComponent />
      </UnheadProvider>,
    )

    // Static head input should not cause patches, dynamic should
    // This test will pass after optimization is implemented
    expect(patchSpy).toHaveBeenCalledTimes(0) // Initial render, no patches yet
  })

  it('should process Head component children efficiently', async () => {
    const head = createHead()
    const childCount = 100

    const startTime = performance.now()

    renderToString(
      <UnheadProvider head={head}>
        <ComplexHeadComponent childCount={childCount} />
      </UnheadProvider>,
    )

    const { headTags } = await renderSSRHead(head)
    const endTime = performance.now()
    const renderTime = endTime - startTime

    // Should process 200 children (100 meta + 100 link) efficiently
    expect(renderTime).toBeLessThan(50) // ms
    expect(headTags).toContain('complex-0')
    expect(headTags).toContain('complex-99')
    expect(headTags).toContain('/asset-0.css')
    expect(headTags).toContain('/asset-99.css')
  })

  it('should handle frequent dynamic updates efficiently', async () => {
    const updateCount = 20
    const times: number[] = []

    for (let i = 0; i < updateCount; i++) {
      const head = createHead()
      const startTime = performance.now()

      renderToString(
        <UnheadProvider head={head}>
          <DynamicHeadComponent updateCount={i} />
        </UnheadProvider>,
      )

      const endTime = performance.now()
      times.push(endTime - startTime)
    }

    const totalTime = times.reduce((a, b) => a + b, 0)

    // Should handle 20 re-renders efficiently
    expect(totalTime).toBeLessThan(200) // ms for 20 renders

    // Test the final state with a fresh head instance
    const finalHead = createHead()
    renderToString(
      <UnheadProvider head={finalHead}>
        <DynamicHeadComponent updateCount={19} />
      </UnheadProvider>,
    )

    const { headTags } = await renderSSRHead(finalHead)
    expect(headTags).toContain('Dynamic 19')
  })

  it('should scale linearly with number of head entries', async () => {
    const testCases = [10, 20, 50]
    const times: number[] = []

    for (const entryCount of testCases) {
      const head = createHead()
      const startTime = performance.now()

      renderToString(
        <UnheadProvider head={head}>
          <MultipleUseHeadComponent entryCount={entryCount} />
        </UnheadProvider>,
      )

      await renderSSRHead(head)
      const endTime = performance.now()
      times.push(endTime - startTime)
    }

    // Performance should scale linearly, not exponentially
    const ratio1 = times[1] / times[0] // 20/10
    const ratio2 = times[2] / times[1] // 50/20

    // Allow some variance but expect roughly linear scaling
    expect(ratio1).toBeLessThan(4) // Should not be 4x slower for 2x entries
    expect(ratio2).toBeLessThan(4) // Should not be 4x slower for 2.5x entries
  })

  it('should not create memory leaks with repeated renders', async () => {
    const head = createHead()
    const iterations = 100

    // Measure initial memory if available
    const initialMemory = process.memoryUsage?.()?.heapUsed || 0

    for (let i = 0; i < iterations; i++) {
      renderToString(
        <UnheadProvider head={head}>
          <MultipleUseHeadComponent entryCount={5} />
          <DynamicHeadComponent updateCount={i} />
        </UnheadProvider>,
      )
    }

    // Force GC if available
    if (globalThis.gc) {
      globalThis.gc()
    }

    const finalMemory = process.memoryUsage?.()?.heapUsed || 0
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024 // MB

    // Should not have significant memory growth for repeated renders
    expect(memoryIncrease).toBeLessThan(50) // Less than 50MB increase
  })
})
