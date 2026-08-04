// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { computed, nextTick, ref } from 'vue'
import { useDom } from '../../../unhead/test/fixtures'
import { useHead, useHeadSafe, useSeoMeta } from '../../src/v4/composables'
import { injectHead } from '../../src/v4/install'
import { csrVueAppWithV4Head, flush } from './util'

describe('v4 dom', () => {
  it('reactive title updates through ref change', async () => {
    const dom = useDom()
    const title = ref('initial')
    const { head } = csrVueAppWithV4Head(dom, () => {
      useHead({ title })
    })
    await flush()
    expect(dom.window.document.title).toBe('initial')

    title.value = 'updated'
    await nextTick()
    head.render!()
    expect(dom.window.document.title).toBe('updated')
  })

  it('computed and getter inputs resolve and track', async () => {
    const dom = useDom()
    const name = ref('site')
    const desc = computed(() => `about ${name.value}`)
    csrVueAppWithV4Head(dom, () => {
      useHead({
        title: () => `${name.value} page`,
        meta: [{ name: 'description', content: desc }],
      })
    })
    await flush()
    expect(dom.window.document.title).toBe('site page')
    expect(dom.window.document.head.querySelector('meta[name=description]')!.getAttribute('content')).toBe('about site')

    name.value = 'new site'
    await flush()
    expect(dom.window.document.title).toBe('new site page')
    expect(dom.window.document.head.querySelector('meta[name=description]')!.getAttribute('content')).toBe('about new site')
  })

  it('entry disposes on unmount', async () => {
    const dom = useDom()
    const { head, app } = csrVueAppWithV4Head(dom, () => {
      useHead({ meta: [{ name: 'description', content: 'mounted' }] })
    })
    await flush()
    expect(dom.window.document.head.querySelector('meta[name=description]')).toBeTruthy()

    app.unmount()
    await flush()
    head.render!()
    expect(dom.window.document.head.querySelector('meta[name=description]')).toBeNull()
  })

  it('works outside a component: no auto dispose', async () => {
    const dom = useDom()
    const { head } = csrVueAppWithV4Head(dom, () => {})
    const entry = useHead({ title: 'no scope' }, { head })
    await flush()
    expect(dom.window.document.title).toBe('no scope')
    entry.patch({ title: 'patched' })
    await flush()
    expect(dom.window.document.title).toBe('patched')
    entry.dispose()
  })

  it('useSeoMeta is reactive on the client', async () => {
    const dom = useDom()
    const ogTitle = ref('first')
    csrVueAppWithV4Head(dom, () => {
      useSeoMeta({ ogTitle })
    })
    await flush()
    expect(dom.window.document.head.querySelector('meta[property="og:title"]')!.getAttribute('content')).toBe('first')

    ogTitle.value = 'second'
    await flush()
    expect(dom.window.document.head.querySelector('meta[property="og:title"]')!.getAttribute('content')).toBe('second')
  })

  it('injectHead inside setup returns the installed head', async () => {
    const dom = useDom()
    let injected: unknown
    const { head } = csrVueAppWithV4Head(dom, () => {
      injected = injectHead()
    })
    expect(injected).toBe(head)
  })

  it('dom:beforeRender shim pauses DOM writes until render() (Nuxt pattern)', async () => {
    const dom = useDom()
    let pauseDOMUpdates = true
    const { head } = csrVueAppWithV4Head(dom, () => {
      useHead({ title: 'paused' })
    })
    head.hooks!.hook('dom:beforeRender', (ctx) => {
      ctx.shouldRender = !pauseDOMUpdates
    })
    useHead({ meta: [{ name: 'description', content: 'late' }] }, { head })
    await flush()
    expect(dom.window.document.head.querySelector('meta[name=description]')).toBeNull()

    // Nuxt syncHead: unpause and flush synchronously
    pauseDOMUpdates = false
    head.render!()
    expect(dom.window.document.title).toBe('paused')
    expect(dom.window.document.head.querySelector('meta[name=description]')!.getAttribute('content')).toBe('late')
  })

  it('useHeadSafe filters hostile input on the client', async () => {
    const dom = useDom()
    csrVueAppWithV4Head(dom, () => {
      useHeadSafe({
        script: [{ innerHTML: 'alert(1)' } as any],
        link: [{ rel: 'icon', href: 'javascript:alert(1)' }],
        meta: [{ name: 'description', content: 'safe' }],
      })
    })
    await flush()
    const html = dom.window.document.head.innerHTML
    expect(html).not.toContain('alert(1)')
    expect(html).not.toContain('javascript:')
    expect(dom.window.document.head.querySelector('meta[name=description]')!.getAttribute('content')).toBe('safe')
  })
})
