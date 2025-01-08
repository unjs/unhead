import { renderSSRHead } from '@unhead/ssr'
import { createHeadWithContext, createServerHeadWithContext } from '../../util'
import { useScript } from '../../src/vanilla/useScript'

describe('ssr useScript', () => {
  it('default', async () => {
    const head = createHeadWithContext()

    useScript({
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
    const head = createServerHeadWithContext()

    useScript({
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
        "headTags": "<script defer fetchpriority="low" crossorigin="anonymous" referrerpolicy="no-referrer" src="https://cdn.example.com/script.js" onload="this.dataset.onloadfired = true" onerror="this.dataset.onerrorfired = true" data-hid="c5c65b0"></script>",
        "htmlAttrs": "",
      }
    `)
  })
  it('await ', async () => {
    const head = createServerHeadWithContext()

    // mock a promise, test that it isn't resolved in 1 second
    useScript<{ foo: 'bar' }>({
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
        "headTags": "<script defer fetchpriority="low" crossorigin="anonymous" referrerpolicy="no-referrer" src="https://cdn.example.com/script.js" onload="this.dataset.onloadfired = true" onerror="this.dataset.onerrorfired = true" data-hid="c5c65b0"></script>",
        "htmlAttrs": "",
      }
    `)
  })
  it('google ', async () => {
    const head = createServerHeadWithContext()
    const window: any = {}
    const gtag = useScript<{ dataLayer: any[] }>({
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
        "headTags": "<script defer fetchpriority="low" crossorigin="anonymous" referrerpolicy="no-referrer" src="https://www.googletagmanager.com/gtm.js?id=GTM-MNJD4B" onload="this.dataset.onloadfired = true" onerror="this.dataset.onerrorfired = true" data-hid="2e8fc9"></script>",
        "htmlAttrs": "",
      }
    `)
  })
})
