import { describe, it } from 'vitest'
import { resolveTags } from '../../../src/utils/resolve'
import { createServerHeadWithContext } from '../../util'

describe('capo', () => {
  it('basic', async () => {
    const head = createServerHeadWithContext()
    head.push({
      script: [{
        defer: true,
        src: 'defer-script.js',
      }],
    })
    head.push({
      script: [{
        src: 'async-script.js',
        type: 'module',
      }],
    })
    head.push({
      script: [{
        src: 'sync-script.js',
      }],
    })
    head.push({
      script: [{
        innerHTML: 'console.log("inline script")',
      }],
    })
    head.push({
      style: [
        '.sync-style { color: red }',
      ],
    })
    head.push({
      link: [{
        rel: 'modulepreload',
        href: 'modulepreload.js',
      }],
    })
    head.push({
      script: [{
        src: 'async-script.js',
        async: true,
      }],
    })
    head.push({
      link: [{
        rel: 'preload',
        href: 'preload.js',
        as: 'script',
      }],
    })
    head.push({
      style: [
        '@import "imported.css"',
      ],
    })
    head.push({
      link: [{
        rel: 'stylesheet',
        href: 'sync-styles.css',
      }],
    })
    head.push({
      title: 'title',
    })
    // preconnect
    head.push({
      link: [{
        rel: 'preconnect',
        href: 'https://example.com',
      }],
    })
    // dns-prefetch
    head.push({
      link: [{
        rel: 'dns-prefetch',
        href: 'https://example.com',
      }],
    })
    // prefetch
    head.push({
      link: [{
        rel: 'prefetch',
        href: 'https://example.com',
      }],
    })
    // prerender
    head.push({
      link: [{
        rel: 'prerender',
        href: 'https://example.com',
      }],
    })
    // meta
    head.push({
      meta: [{
        name: 'description',
        content: 'description',
      }],
    })
    head.push({
      meta: [{
        name: 'viewport',
        content: 'width=device-width, initial-scale=1.0',
      }],
    })

    const resolvedTags = resolveTags(head)
    // VIEWPORT
    expect(resolvedTags[0].tag).toEqual('meta')
    expect(resolvedTags[0].props.name).toEqual('viewport')
    // TITLE
    expect(resolvedTags[1].tag).toEqual('title')
    // PRECONNECT
    expect(resolvedTags[2].tag).toEqual('link')
    expect(resolvedTags[2].props.rel).toEqual('preconnect')
    // ASYNC SCRIPT
    expect(resolvedTags[3].tag).toEqual('script')
    expect(resolvedTags[3].props.async).toEqual(true)
    // IMPORTED CSS
    expect(resolvedTags[4].tag).toEqual('style')
    expect(resolvedTags[4].innerHTML).toEqual('@import "imported.css"')
    // SYNC SCRIPT
    expect(resolvedTags[5].tag).toEqual('script')
    expect(resolvedTags[5].props.src).toEqual('sync-script.js')
    // INLINE SCRIPT
    expect(resolvedTags[6].tag).toEqual('script')
    expect(resolvedTags[6].innerHTML).toEqual('console.log("inline script")')
    // SYNC STYLE
    expect(resolvedTags[7].tag).toEqual('style')
    expect(resolvedTags[7].innerHTML).toEqual('.sync-style { color: red }')
    expect(resolvedTags[8].tag).toEqual('link')
    expect(resolvedTags[8].props.rel).toEqual('stylesheet')
    // PRELOAD
    expect(resolvedTags[9].tag).toEqual('link')
    expect(resolvedTags[9].props.rel).toEqual('modulepreload')
    expect(resolvedTags[10].tag).toEqual('link')
    expect(resolvedTags[10].props.rel).toEqual('preload')
    // DEFER SCRIPT
    expect(resolvedTags[11].tag).toEqual('script')
    expect(resolvedTags[11].props.defer).toEqual(true)
    // MODULE SCRIPT
    expect(resolvedTags[12].tag).toEqual('script')
    expect(resolvedTags[12].props.type).toEqual('module')
    // DNS-PREFETCH
    expect(resolvedTags[13].tag).toEqual('link')
    expect(resolvedTags[13].props.rel).toEqual('dns-prefetch')
    // PREFETCH
    expect(resolvedTags[14].tag).toEqual('link')
    expect(resolvedTags[14].props.rel).toEqual('prefetch')
    // PRERENDER
    expect(resolvedTags[15].tag).toEqual('link')
    expect(resolvedTags[15].props.rel).toEqual('prerender')
    // META
    expect(resolvedTags[16].tag).toEqual('meta')
    expect(resolvedTags[16].props.name).toEqual('description')
  })

  it('importmap precedes modulepreload and module scripts', async () => {
    const head = createServerHeadWithContext()
    // push in reverse order to prove sorting, not insertion order
    head.push({
      script: [{
        src: 'entry.js',
        type: 'module',
      }],
    })
    head.push({
      link: [{
        rel: 'modulepreload',
        href: 'preloaded.js',
      }],
    })
    head.push({
      script: [{
        type: 'importmap',
        // raw object exercises the normalize auto-serialization path
        textContent: { imports: { '#entry': '/entry.js' } },
      }],
    })

    const resolvedTags = resolveTags(head)
    const scriptAndLinkTags = resolvedTags.filter(t => t.tag === 'script' || t.tag === 'link')
    // IMPORTMAP must come first
    expect(scriptAndLinkTags[0].tag).toEqual('script')
    expect(scriptAndLinkTags[0].props.type).toEqual('importmap')
    // normalize should have serialized the object to a JSON string
    expect(typeof scriptAndLinkTags[0].textContent).toBe('string')
    expect(scriptAndLinkTags[0].textContent).toContain('#entry')
    // MODULEPRELOAD
    expect(scriptAndLinkTags[1].tag).toEqual('link')
    expect(scriptAndLinkTags[1].props.rel).toEqual('modulepreload')
    // MODULE SCRIPT
    expect(scriptAndLinkTags[2].tag).toEqual('script')
    expect(scriptAndLinkTags[2].props.type).toEqual('module')
  })

  it('speculationrules sorts late alongside prefetch/prerender', async () => {
    const head = createServerHeadWithContext()
    head.push({
      script: [{
        type: 'speculationrules',
        // raw object exercises the normalize auto-serialization path
        textContent: { prefetch: [{ source: 'list', urls: ['/next'] }] },
      }],
    })
    head.push({
      link: [{ rel: 'stylesheet', href: 'styles.css' }],
    })
    head.push({
      script: [{ src: 'sync.js' }],
    })
    head.push({
      script: [{ src: 'module.js', type: 'module' }],
    })

    const resolvedTags = resolveTags(head)
    const scriptAndLinkTags = resolvedTags.filter(t => t.tag === 'script' || t.tag === 'link')
    // sync script (50) first
    expect(scriptAndLinkTags[0].tag).toEqual('script')
    expect(scriptAndLinkTags[0].props.src).toEqual('sync.js')
    // stylesheet (60)
    expect(scriptAndLinkTags[1].tag).toEqual('link')
    expect(scriptAndLinkTags[1].props.rel).toEqual('stylesheet')
    // module script (80)
    expect(scriptAndLinkTags[2].tag).toEqual('script')
    expect(scriptAndLinkTags[2].props.type).toEqual('module')
    // speculationrules (90) last, after modules
    expect(scriptAndLinkTags[3].tag).toEqual('script')
    expect(scriptAndLinkTags[3].props.type).toEqual('speculationrules')
  })

  it('importmap precedes async module scripts', async () => {
    const head = createServerHeadWithContext()
    // async module scripts must not sort before importmap per HTML spec:
    // importmap must be declared before any module script, async or not.
    head.push({
      script: [{
        src: 'entry.js',
        type: 'module',
        async: true,
      }],
    })
    head.push({
      script: [{
        type: 'importmap',
        innerHTML: JSON.stringify({ imports: { '#entry': '/entry.js' } }),
      }],
    })

    const resolvedTags = resolveTags(head)
    const scriptTags = resolvedTags.filter(t => t.tag === 'script')
    expect(scriptTags[0].props.type).toEqual('importmap')
    expect(scriptTags[1].props.type).toEqual('module')
    expect(scriptTags[1].props.async).toEqual(true)
  })

  it('inline script with textContent sorts in the sync bucket', async () => {
    const head = createServerHeadWithContext()
    // inline scripts can use textContent (recommended, XSS-safe) instead of
    // innerHTML; they should still sort in the sync-script bucket (50), not
    // fall through to the default 100.
    head.push({
      script: [{ src: 'prefetch.js', async: true }],
    })
    head.push({
      script: [{ textContent: 'console.log("inline")' }],
    })

    const resolvedTags = resolveTags(head)
    const scriptTags = resolvedTags.filter(t => t.tag === 'script')
    // async (30) should come before sync inline (50)
    expect(scriptTags[0].props.src).toEqual('prefetch.js')
    expect(scriptTags[0].props.async).toEqual(true)
    expect(scriptTags[1].textContent).toEqual('console.log("inline")')
  })
})
