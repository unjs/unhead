import { createHead as createServerHead, renderSSRHead } from 'unhead/server'
import { useScript } from '../../src/useScript'

describe('ssr useScript', () => {
  it('default', async () => {
    const head = createServerHead({
      disableDefaults: true,
    })

    useScript(head, {
      src: 'https://cdn.example.com/script.js',
    })

    const ctx = await renderSSRHead(head)
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

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script defer fetchpriority="low" crossorigin="anonymous" referrerpolicy="no-referrer" src="https://cdn.example.com/script.js" onload="this.dataset.onloadfired = true" onerror="this.dataset.onerrorfired = true" data-hid="https://cdn.example.com/script.js"></script>",
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

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script defer fetchpriority="low" crossorigin="anonymous" referrerpolicy="no-referrer" src="https://cdn.example.com/script.js" onload="this.dataset.onloadfired = true" onerror="this.dataset.onerrorfired = true" data-hid="https://cdn.example.com/script.js"></script>",
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
          window.dataLayer.push({ 'gtm.start': new Date().getTime(), 'event': 'gtm.js' })
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

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script defer fetchpriority="low" crossorigin="anonymous" referrerpolicy="no-referrer" src="https://www.googletagmanager.com/gtm.js?id=GTM-MNJD4B" onload="this.dataset.onloadfired = true" onerror="this.dataset.onerrorfired = true" data-hid="https://www.googletagmanager.com/gtm.js?id=GTM-MNJD4B"></script>",
        "htmlAttrs": "",
      }
    `)
  })
})
