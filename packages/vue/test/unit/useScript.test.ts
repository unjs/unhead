// @vitest-environment jsdom
import { createHead } from '@unhead/vue/client'
import { renderSSRHead } from '@unhead/vue/server'

import { describe, it } from 'vitest'
import { createApp, h, ref, watch } from 'vue'
import { useDom } from '../../../unhead/test/util'
import { createHeadCore } from '../../src'
import { useScript } from '../../src/scripts/useScript'

describe('vue e2e scripts', () => {
  it('multiple active promise handles', async () => {
    const dom = useDom()
    const head = createHead({
      document: dom.window.document,
    })

    const isTrigger1Active = ref(false)
    const trigger1 = new Promise<void>((resolve) => {
      watch(isTrigger1Active, (val) => {
        if (val) {
          resolve()
        }
      })
    })

    const isTrigger2Active = ref(false)
    const trigger2 = new Promise<void>((resolve) => {
      watch(isTrigger2Active, (val) => {
        if (val) {
          resolve()
        }
      })
    })

    const { status } = useScript({
      src: '//duplicate.script',
    }, {
      // leaving the page will stop the trigger from activating
      trigger: trigger1,
      head,
    })

    const { status: status2, _triggerPromises } = useScript({
      src: '//duplicate.script',
    }, {
      // leaving the page will stop the trigger from activating
      trigger: trigger2,
      head,
    })

    // two promises pending
    expect(_triggerPromises).toMatchInlineSnapshot(`
      [
        Promise {},
        Promise {},
      ]
    `)

    // trigger using the first promise
    isTrigger1Active.value = true
    // wait next tick
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve()
      }, 25)
    })

    // both should be loaded
    expect(status.value).toEqual('loading')
    expect(status2.value).toEqual('loading')
  })

  it('ref trigger', async () => {
    const dom = useDom()
    const head = createHead({
      document: dom.window.document,
    })

    const isTrigger1Active = ref(false)
    const isTrigger2Active = ref(false)

    const { status } = useScript({
      src: '//duplicate.script',
    }, {
      // leaving the page will stop the trigger from activating
      trigger: isTrigger1Active,
      head,
    })

    const { status: status2, _triggerPromises } = useScript({
      src: '//duplicate.script',
    }, {
      // leaving the page will stop the trigger from activating
      trigger: isTrigger2Active,
      head,
    })

    // two promises pending
    expect(_triggerPromises).toMatchInlineSnapshot(`
      [
        Promise {},
        Promise {},
      ]
    `)

    // trigger using the first promise
    isTrigger1Active.value = true
    // wait next tick
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve()
      }, 25)
    })

    // both should be loaded
    expect(status.value).toEqual('loading')
    expect(status2.value).toEqual('loading')
  })

  it('getter function trigger', async () => {
    const dom = useDom()
    const head = createHead({
      document: dom.window.document,
    })

    const shouldLoad = ref(false)

    const { status, _triggerPromises } = useScript({
      src: '//getter-trigger.script',
    }, {
      // getter function like () => shouldLoad.value
      trigger: () => shouldLoad.value,
      head,
    })

    // promise pending
    expect(_triggerPromises).toMatchInlineSnapshot(`
      [
        Promise {},
      ]
    `)

    expect(status.value).toEqual('awaitingLoad')

    // trigger by setting the ref
    shouldLoad.value = true
    // wait next tick
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve()
      }, 25)
    })

    expect(status.value).toEqual('loading')
  })

  it('respects useScript privacy controls - #293', async () => {
    const head = createHeadCore()
    const script = useScript({
      src: 'https://s.kk-resources.com/leadtag.js',
      async: true,
      crossorigin: false,
    }, {
      // @ts-expect-error untyped
      head,
    })
    const ssr = await renderSSRHead(head)
    expect(ssr.headTags.replace('>', '').split(' ').sort()).toMatchInlineSnapshot(`
      [
        "<link",
        "as="script"",
        "fetchpriority="low"",
        "href="https://s.kk-resources.com/leadtag.js"",
        "referrerpolicy="no-referrer"",
        "rel="preload"",
      ]
    `)
    script.remove()
  })
  it('respects useScript privacy controls', async () => {
    const head = createHeadCore()
    const script = useScript({
      src: 'https://s.kk-resources.com/leadtag.js',
      crossorigin: 'use-credentials',
      referrerpolicy: 'no-referrer-when-downgrade',
    }, {
      // @ts-expect-error untyped
      head,
    })
    const ssr = await renderSSRHead(head)
    expect(ssr.headTags.replace('>', '').split(' ').sort()).toMatchInlineSnapshot(`
      [
        "<link",
        "as="script"",
        "crossorigin="use-credentials"",
        "fetchpriority="low"",
        "href="https://s.kk-resources.com/leadtag.js"",
        "referrerpolicy="no-referrer-when-downgrade"",
        "rel="preload"",
      ]
    `)
    script.remove()
  })

  it('setupTriggerHandler race condition: old scope disposal should not abort new scope trigger', async () => {
    const dom = useDom()
    const head = createHead({
      document: dom.window.document,
    })

    // simulate a first page visit: component uses useScript with a trigger that never resolves
    // and the user navigates away before interacting
    const el1 = dom.window.document.createElement('div')
    const app1 = createApp({
      setup() {
        useScript({
          src: '//race-condition-script.js',
        }, {
          trigger: new Promise(() => {}), // never resolves
          head,
        })
        return () => h('div')
      },
    })
    app1.mount(el1)

    const script = (head as any)._scripts['//race-condition-script.js']
    expect(script.status).toBe('awaitingLoad')
    expect(script._triggerAbortController).toBeTruthy()

    const { resolve: resolveTrigger2, promise: trigger2 } = Promise.withResolvers<void>()

    // simulate client-side navigation: the new page mounts BEFORE the old page unmounts
    const el2 = dom.window.document.createElement('div')
    const app2 = createApp({
      setup() {
        useScript({
          src: '//race-condition-script.js',
        }, {
          trigger: trigger2,
          head,
        })
        return () => h('div')
      },
    })
    app2.mount(el2)

    expect(script.status).toBe('awaitingLoad')

    app1.unmount()

    // the user interacts on the new page, resolving `trigger2`
    resolveTrigger2()
    await new Promise<void>(resolve => setTimeout(resolve, 0))

    // as `trigger2` is now resolved, we expect `script.load()` to have been called
    expect(script.status).toBe('loading')
  })
})
