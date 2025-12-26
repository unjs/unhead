/* eslint-disable no-console */
import { renderSSRHeadShell, renderSSRHeadSuspenseChunk } from 'unhead'
import { describe, it } from 'vitest'
import {
  renderSSRHead,

} from '../../src/server'
import { createServerHeadWithContext, createStreamableServerHead } from '../util'

// Run with: pnpm test:benchmark
// Skip in CI by default - set RUN_BENCHMARKS=1 to enable
const describeBenchmark = process.env.RUN_BENCHMARKS ? describe : describe.skip

describeBenchmark('streaming SSR benchmarks', () => {
  const WARMUP_RUNS = 5
  const BENCHMARK_RUNS = 100

  const runBenchmark = async (name: string, fn: () => void | Promise<void>) => {
    // Warmup
    for (let i = 0; i < WARMUP_RUNS; i++) {
      await fn()
    }

    const times: number[] = []
    for (let i = 0; i < BENCHMARK_RUNS; i++) {
      const start = performance.now()
      await fn()
      times.push(performance.now() - start)
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length
    const min = Math.min(...times)
    const max = Math.max(...times)
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]

    return { name, avg, min, max, p95 }
  }

  describe('head tag resolution overhead', () => {
    it('compares renderSSRHeadSuspenseChunk vs renderSSRHeadSuspenseChunk', async () => {
      const results: { name: string, avg: number, min: number, max: number, p95: number }[] = []

      // Setup: create head with initial tags, render shell, add new tags
      const setupHead = async () => {
        const head = createStreamableServerHead()
        head.push({
          title: 'Initial',
          meta: [
            { name: 'description', content: 'Initial description' },
            { name: 'viewport', content: 'width=device-width' },
          ],
        })
        await renderSSRHeadShell(head, '<html><head></head><body>')

        // Add new tags to be resolved
        for (let i = 0; i < 10; i++) {
          head.push({
            meta: [{ name: `dynamic-${i}`, content: `value-${i}` }],
          })
        }
        return head
      }

      // Benchmark async version
      results.push(await runBenchmark('renderSSRHeadSuspenseChunk (async)', async () => {
        const head = await setupHead()
        await renderSSRHeadSuspenseChunk(head)
      }))

      // Benchmark sync version
      results.push(await runBenchmark('renderSSRHeadSuspenseChunk', async () => {
        const head = await setupHead()
        renderSSRHeadSuspenseChunk(head)
      }))

      // Benchmark baseline renderSSRHead
      results.push(await runBenchmark('renderSSRHead (baseline)', async () => {
        const head = createServerHeadWithContext()
        head.push({
          title: 'Test',
          meta: Array.from({ length: 10 }, (_, i) => ({
            name: `meta-${i}`,
            content: `value-${i}`,
          })),
        })
        await renderSSRHead(head)
      }))

      console.log('\n=== Head Tag Resolution Overhead ===')
      console.table(results.map(r => ({
        'Name': r.name,
        'Avg (ms)': r.avg.toFixed(4),
        'Min (ms)': r.min.toFixed(4),
        'Max (ms)': r.max.toFixed(4),
        'P95 (ms)': r.p95.toFixed(4),
      })))
    })
  })

  describe('memory usage during concurrent streams', () => {
    it('tracks heap with multiple simultaneous streaming heads', async () => {
      const CONCURRENT_STREAMS = [1, 5, 10, 25, 50]
      const results: { streams: number, heapBefore: number, heapAfter: number, heapDelta: number, timeMs: number }[] = []

      for (const streamCount of CONCURRENT_STREAMS) {
        // Force GC if available
        if ((globalThis as any).gc)
          (globalThis as any).gc()

        const heapBefore = process.memoryUsage().heapUsed

        const start = performance.now()

        // Create concurrent streaming heads
        const heads = Array.from({ length: streamCount }, () => createStreamableServerHead())

        // Push initial tags to all
        heads.forEach((head) => {
          head.push({
            title: 'Concurrent Stream',
            meta: Array.from({ length: 20 }, (_, i) => ({
              name: `meta-${i}`,
              content: `Concurrent stream content ${i}`,
            })),
            script: [{ src: 'app.js' }, { src: 'analytics.js' }],
            link: [
              { rel: 'stylesheet', href: 'styles.css' },
              { rel: 'preload', href: 'font.woff2', as: 'font' },
            ],
          })
        })

        // Render shells concurrently
        await Promise.all(
          heads.map(head => renderSSRHeadShell(head, '<html><head></head><body>')),
        )

        // Add more tags (simulating async components)
        heads.forEach((head) => {
          head.push({
            meta: Array.from({ length: 10 }, (_, i) => ({
              name: `async-meta-${i}`,
              content: `Async content ${i}`,
            })),
          })
        })

        // Render chunks concurrently
        await Promise.all(
          heads.map(head => renderSSRHeadSuspenseChunk(head)),
        )

        const timeMs = performance.now() - start
        const heapAfter = process.memoryUsage().heapUsed
        const heapDelta = heapAfter - heapBefore

        results.push({
          streams: streamCount,
          heapBefore: Math.round(heapBefore / 1024),
          heapAfter: Math.round(heapAfter / 1024),
          heapDelta: Math.round(heapDelta / 1024),
          timeMs,
        })
      }

      console.log('\n=== Memory Usage During Concurrent Streams ===')
      console.table(results.map(r => ({
        'Streams': r.streams,
        'Heap Before (KB)': r.heapBefore,
        'Heap After (KB)': r.heapAfter,
        'Heap Delta (KB)': r.heapDelta,
        'Time (ms)': r.timeMs.toFixed(2),
      })))
    })
  })

  describe('large payload performance', () => {
    it('benchmarks 50+ meta tags', async () => {
      const results: { name: string, avg: number, min: number, max: number, p95: number }[] = []
      const META_COUNTS = [10, 25, 50, 100]

      for (const count of META_COUNTS) {
        // Streaming approach
        results.push(await runBenchmark(`streaming: ${count} meta tags`, async () => {
          const head = createStreamableServerHead()
          head.push({
            title: 'Large Payload Test',
            meta: Array.from({ length: count }, (_, i) => ({
              name: `meta-${i}`,
              content: `This is meta content for tag number ${i} with some extra text`,
            })),
          })
          await renderSSRHeadShell(head, '<html><head></head><body>')
        }))

        // Baseline approach
        results.push(await runBenchmark(`baseline: ${count} meta tags`, async () => {
          const head = createServerHeadWithContext()
          head.push({
            title: 'Large Payload Test',
            meta: Array.from({ length: count }, (_, i) => ({
              name: `meta-${i}`,
              content: `This is meta content for tag number ${i} with some extra text`,
            })),
          })
          await renderSSRHead(head)
        }))
      }

      console.log('\n=== Large Payload Performance (Meta Tags) ===')
      console.table(results.map(r => ({
        'Name': r.name,
        'Avg (ms)': r.avg.toFixed(4),
        'Min (ms)': r.min.toFixed(4),
        'Max (ms)': r.max.toFixed(4),
        'P95 (ms)': r.p95.toFixed(4),
      })))
    })

    it('benchmarks deeply nested JSON-LD', async () => {
      const results: { name: string, avg: number, min: number, max: number, p95: number }[] = []
      const NESTING_DEPTHS = [2, 5, 10]

      const createNestedObject = (depth: number, breadth: number = 3): object => {
        if (depth === 0) {
          return { value: 'leaf node', data: Array.from({ length: 5 }, (_, i) => `item-${i}`) }
        }
        const obj: Record<string, any> = { '@type': `Level${depth}` }
        for (let i = 0; i < breadth; i++) {
          obj[`child${i}`] = createNestedObject(depth - 1, breadth)
        }
        return obj
      }

      for (const depth of NESTING_DEPTHS) {
        const jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          'name': 'Test Organization',
          'nested': createNestedObject(depth),
          'items': Array.from({ length: 20 }, (_, i) => ({
            '@type': 'Thing',
            'name': `Item ${i}`,
            'description': `Description for item ${i}`,
          })),
        }

        // Streaming approach
        results.push(await runBenchmark(`streaming: depth ${depth} JSON-LD`, async () => {
          const head = createStreamableServerHead()
          head.push({
            script: [{
              type: 'application/ld+json',
              innerHTML: JSON.stringify(jsonLd),
            }],
          })
          await renderSSRHeadShell(head, '<html><head></head><body>')
        }))

        // Baseline approach
        results.push(await runBenchmark(`baseline: depth ${depth} JSON-LD`, async () => {
          const head = createServerHeadWithContext()
          head.push({
            script: [{
              type: 'application/ld+json',
              innerHTML: JSON.stringify(jsonLd),
            }],
          })
          await renderSSRHead(head)
        }))
      }

      console.log('\n=== Large Payload Performance (JSON-LD Depth) ===')
      console.table(results.map(r => ({
        'Name': r.name,
        'Avg (ms)': r.avg.toFixed(4),
        'Min (ms)': r.min.toFixed(4),
        'Max (ms)': r.max.toFixed(4),
        'P95 (ms)': r.p95.toFixed(4),
      })))
    })

    it('benchmarks combined large payloads', async () => {
      const results: { name: string, avg: number, min: number, max: number, p95: number }[] = []

      const largeJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        'mainEntity': {
          '@type': 'Product',
          'name': 'Test Product',
          'offers': Array.from({ length: 50 }, (_, i) => ({
            '@type': 'Offer',
            'price': 99.99 + i,
            'priceCurrency': 'USD',
            'seller': {
              '@type': 'Organization',
              'name': `Seller ${i}`,
            },
          })),
          'review': Array.from({ length: 30 }, (_, i) => ({
            '@type': 'Review',
            'author': { '@type': 'Person', 'name': `Reviewer ${i}` },
            'reviewRating': { '@type': 'Rating', 'ratingValue': (i % 5) + 1 },
            'reviewBody': `This is review number ${i} with detailed feedback about the product.`,
          })),
        },
      }

      // Streaming: combined payload
      results.push(await runBenchmark('streaming: combined (50 meta + JSON-LD)', async () => {
        const head = createStreamableServerHead()
        head.push({
          title: 'Complex Page',
          meta: Array.from({ length: 50 }, (_, i) => ({
            name: `meta-${i}`,
            content: `Meta content ${i}`,
          })),
          script: [{
            type: 'application/ld+json',
            innerHTML: JSON.stringify(largeJsonLd),
          }],
          link: Array.from({ length: 10 }, (_, i) => ({
            rel: 'preload',
            href: `resource-${i}.js`,
            as: 'script',
          })),
        })
        await renderSSRHeadShell(head, '<html><head></head><body>')
      }))

      // Baseline: combined payload
      results.push(await runBenchmark('baseline: combined (50 meta + JSON-LD)', async () => {
        const head = createServerHeadWithContext()
        head.push({
          title: 'Complex Page',
          meta: Array.from({ length: 50 }, (_, i) => ({
            name: `meta-${i}`,
            content: `Meta content ${i}`,
          })),
          script: [{
            type: 'application/ld+json',
            innerHTML: JSON.stringify(largeJsonLd),
          }],
          link: Array.from({ length: 10 }, (_, i) => ({
            rel: 'preload',
            href: `resource-${i}.js`,
            as: 'script',
          })),
        })
        await renderSSRHead(head)
      }))

      console.log('\n=== Combined Large Payload Performance ===')
      console.table(results.map(r => ({
        'Name': r.name,
        'Avg (ms)': r.avg.toFixed(4),
        'Min (ms)': r.min.toFixed(4),
        'Max (ms)': r.max.toFixed(4),
        'P95 (ms)': r.p95.toFixed(4),
      })))
    })
  })

  describe('streaming chunk generation', () => {
    it('benchmarks incremental chunk rendering', async () => {
      const results: { name: string, avg: number, min: number, max: number, p95: number }[] = []
      const CHUNK_COUNTS = [1, 5, 10, 20]

      for (const chunks of CHUNK_COUNTS) {
        results.push(await runBenchmark(`${chunks} suspense chunks`, async () => {
          const head = createStreamableServerHead()
          head.push({ title: 'Initial' })
          await renderSSRHeadShell(head, '<html><head></head><body>')

          for (let i = 0; i < chunks; i++) {
            head.push({
              meta: [{ name: `chunk-${i}`, content: `Chunk ${i} content` }],
            })
            await renderSSRHeadSuspenseChunk(head)
          }
        }))
      }

      console.log('\n=== Streaming Chunk Generation ===')
      console.table(results.map(r => ({
        'Name': r.name,
        'Avg (ms)': r.avg.toFixed(4),
        'Min (ms)': r.min.toFixed(4),
        'Max (ms)': r.max.toFixed(4),
        'P95 (ms)': r.p95.toFixed(4),
      })))
    })
  })
})
