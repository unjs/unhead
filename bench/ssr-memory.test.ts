import { describe, expect, it } from 'vitest'
import { useHead, useSeoMeta } from '../packages/unhead/src'
import { createHead, renderSSRHead } from '../packages/unhead/src/server'
import { formatBytes, measureMemory } from './utils/perf'

function renderMediumSsrHead() {
  const head = createHead({ disableDefaults: true })
  head.push({
    title: 'Memory benchmark',
    templateParams: {
      separator: '-',
      siteName: 'Unhead',
    },
  })

  for (let i = 0; i < 40; i++) {
    useHead(head, {
      meta: [
        { name: `description-${i}`, content: `Description ${i}` },
        { property: 'og:image', content: `/image-${i}.png` },
      ],
      link: [
        { rel: 'preload', as: 'script', href: `/_nuxt/chunk-${i}.js` },
      ],
      script: [
        {
          type: 'application/ld+json',
          innerHTML: {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            'name': `Page ${i}`,
          },
        },
      ],
    })
  }

  useSeoMeta(head, {
    title: 'Memory benchmark',
    titleTemplate: '%s %separator %siteName',
    description: 'SSR memory benchmark',
    ogTitle: 'Memory benchmark',
    ogDescription: 'SSR memory benchmark',
    ogImage: '/og.png',
    twitterCard: 'summary_large_image',
    twitterImage: '/og.png',
  })

  return renderSSRHead(head, { omitLineBreaks: true })
}

describe('ssr memory', () => {
  it('does not retain excessive heap across repeated medium SSR renders', async () => {
    const result = await measureMemory('medium ssr render', renderMediumSsrHead, {
      warmup: 5,
      runs: 75,
    })

    // eslint-disable-next-line no-console -- informational benchmark output
    console.table([{
      name: result.name,
      runs: result.runs,
      durationMs: Math.round(result.durationMs * 100) / 100,
      heapUsedDelta: formatBytes(result.delta.heapUsed),
      rssDelta: formatBytes(result.delta.rss),
    }])

    expect(result.after.heapUsed).toBeGreaterThan(0)
    if ((globalThis as any).gc)
      expect(result.delta.heapUsed).toBeLessThan(8 * 1024 * 1024)
  })
})
