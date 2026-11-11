import { describe, expect, it } from 'vitest'
import { useScript } from '../../../src/composables'
import { createHead as createServerHead, renderSSRHead } from '../../../src/server'

describe('ssr useScript', () => {
  it.each([
    [{}, 'anonymous'],
    [{ crossorigin: undefined }, null],
    // The runtime accepts false, although the public type excludes it.
    [{ crossorigin: false as any }, null],
    [{ crossorigin: '' }, ''],
    [{ crossorigin: 'anonymous' }, 'anonymous'],
    [{ crossorigin: 'use-credentials' }, 'use-credentials'],
  ] as const)('keeps script and preload crossorigin aligned for %o', (input, expected) => {
    const head = createServerHead({ disableDefaults: true })
    const script = useScript(head, {
      src: 'https://cdn.example.com/script.js',
      ...input,
    }, { trigger: 'server' })
    script.warmup('preload')

    const { headTags } = renderSSRHead(head)
    const tags = headTags.match(/<(?:script|link)\b[^>]*>/g)
    expect(tags).toHaveLength(2)
    for (const tag of tags!) {
      const crossorigin = tag.match(/\scrossorigin(?:="([^"]*)")?(?=\s|>)/)
      expect(crossorigin ? crossorigin[1] ?? '' : null).toBe(expected)
      expect(tag).toContain('referrerpolicy="no-referrer"')
    }
  })
  it('default', async () => {
    const head = createServerHead({
      disableDefaults: true,
    })

    useScript(head, {
      src: 'https://cdn.example.com/script.js',
    })

    const ctx = renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<link href="https://cdn.example.com/script.js" rel="preload" crossorigin="anonymous" referrerpolicy="no-referrer" fetchpriority="low" as="script">",
        "htmlAttrs": "",
      }
    `)
  })
  it('server', async () => {
    const head = createServerHead({
      disableDefaults: true,
    })

    useScript(head, {
      src: 'https://cdn.example.com/script.js',
    }, {
      trigger: 'server',
    })

    const ctx = renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script defer fetchpriority="low" src="https://cdn.example.com/script.js" crossorigin="anonymous" referrerpolicy="no-referrer" onload="this.dataset.onloadfired = true" onerror="this.dataset.onerrorfired = true"></script>",
        "htmlAttrs": "",
      }
    `)
  })
  it('await ', async () => {
    const head = createServerHead({
      disableDefaults: true,
    })

    // mock a promise, test that it isn't resolved in 1 second
    useScript<{ foo: 'bar' }>(head, {
      src: 'https://cdn.example.com/script.js',
    }, {
      trigger: 'server',
    })

    const ctx = renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script defer fetchpriority="low" src="https://cdn.example.com/script.js" crossorigin="anonymous" referrerpolicy="no-referrer" onload="this.dataset.onloadfired = true" onerror="this.dataset.onerrorfired = true"></script>",
        "htmlAttrs": "",
      }
    `)
  })
  it('google ', async () => {
    const head = createServerHead({
      disableDefaults: true,
    })
    const window: any = {}
    const gtag = useScript<{ dataLayer: any[] }>(head, {
      src: 'https://www.googletagmanager.com/gtm.js?id=GTM-MNJD4B',
    }, {
      beforeInit() {
        if (typeof window !== 'undefined') {
          window.dataLayer = window.dataLayer || []
          window.dataLayer.push({ 'gtm.start': Date.now(), 'event': 'gtm.js' })
        }
      },
      use() {
        return {
          dataLayer: window.dataLayer,
        }
      },
      trigger: 'server',
    })

    // just checkign types and no exceptions are thrown
    gtag.proxy.dataLayer.push({
      event: 'page.load',
    })

    const ctx = renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script defer fetchpriority="low" src="https://www.googletagmanager.com/gtm.js?id=GTM-MNJD4B" crossorigin="anonymous" referrerpolicy="no-referrer" onload="this.dataset.onloadfired = true" onerror="this.dataset.onerrorfired = true"></script>",
        "htmlAttrs": "",
      }
    `)
  })
})
