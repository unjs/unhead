import { createHead } from '@unhead/vue/client'
import { renderSSRHead } from '@unhead/vue/server'

import { describe, it } from 'vitest'
import { ref, watch } from 'vue'
import { useDom } from '../../../unhead/test/util'
import { useScript } from '../../src/scripts/useScript'
import { createHeadCore } from '../../src'

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

  it('respects useScript privacy controls - #293', async () => {
    const head = createHeadCore()
    const script = useScript({
      src: 'https://s.kk-resources.com/leadtag.js',
      async: true,
      crossorigin: false,
    }, {
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
})
