import type { HeadValidationRule } from 'unhead/plugins'
import { ValidatePlugin } from 'unhead/plugins'
import { createHead, renderSSRHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'

function createPage() {
  const reports: HeadValidationRule[] = []
  const head = createHead({ plugins: [ValidatePlugin({ onReport: rules => reports.push(...rules) })] })
  head.push({ title: 'Home', meta: [{ name: 'description', content: 'A Nuxt page.' }] })
  return { head, reports }
}

describe('nuxt validation', () => {
  it('accepts Nuxt payloads, import maps, and generated resource hints', () => {
    const { head, reports } = createPage()
    // Nuxt's renderer registers payloads in bodyClose and preloads classic deferred entries.
    head.push({ script: [{
      'id': '__NUXT_DATA__',
      'type': 'application/json',
      'data-nuxt-data': 'nuxt-app',
      'data-ssr': true,
      'innerHTML': JSON.stringify([{ data: 'a'.repeat(4096) }]),
    }] }, { tagPosition: 'bodyClose', tagPriority: 'high' })
    head.push({
      script: [
        { type: 'importmap', innerHTML: JSON.stringify({ imports: Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`chunk-${i}`, `/_nuxt/chunk-${i}.js`])) }) },
        { src: '/_nuxt/entry.js', type: 'module', crossorigin: '' },
        { src: '/_nuxt/legacy.js', defer: true, crossorigin: '' },
      ],
      link: [
        { rel: 'modulepreload', href: '/_nuxt/entry.js', crossorigin: '' },
        { rel: 'preload', href: '/_nuxt/legacy.js', as: 'script', crossorigin: '' },
        { rel: 'preload', href: '/_payload.json', as: 'fetch', crossorigin: 'anonymous' },
      ],
    })
    const html = renderSSRHead(head)
    expect(html.bodyTags).toContain('__NUXT_DATA__')
    expect(reports).toEqual([])
  })

  it.each(['application/json', 'application/ld+json', 'importmap', 'speculationrules', 'text/plain', 'text/javascript; charset=utf-8', 'application/javascript; charset=utf-8', ' ', '\t\n\r', '\u00A0text/javascript', 'text/javascript\uFEFF', 'text/javascript\u2028'])('does not recommend externalizing %s data', (type) => {
    const { head, reports } = createPage()
    head.push({ script: [{ type, innerHTML: JSON.stringify({ data: 'a'.repeat(4096) }) }] } as any)
    renderSSRHead(head)
    expect(reports).toEqual([])
  })

  it.each([undefined, '', true, 'module', 'MODULE', 'text/javascript', 'application/javascript', ' text/javascript ', '\ttext/javascript\n'])('still reports large executable scripts with type %s', (type) => {
    const { head, reports } = createPage()
    head.push({ script: [{ type, innerHTML: `console.log("${'a'.repeat(4096)}")` }] } as any)
    renderSSRHead(head)
    expect(reports.map(rule => rule.id)).toEqual(['inline-script-size'])
  })

  it.each(['async', 'defer'] as const)('accepts intentionally preloaded %s scripts', (attribute) => {
    const { head, reports } = createPage()
    head.push({
      link: [{ rel: 'preload', href: '/entry.js', as: 'script' }],
      script: [{ src: '/entry.js', [attribute]: true }],
    })
    renderSSRHead(head)
    expect(reports).toEqual([])
  })

  it.each(['image', 'font', 'fetch'] as const)('accepts low-priority %s preloads', (as) => {
    const { head, reports } = createPage()
    head.push({ link: [{ rel: 'preload', href: '/asset', as, crossorigin: 'anonymous', fetchpriority: 'low' }] } as any)
    renderSSRHead(head)
    expect(reports).toEqual([])
  })
})
