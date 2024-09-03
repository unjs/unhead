import { describe, it } from 'vitest'
import { createHead, useScript } from '@unhead/vue'
import { ref, watch } from 'vue'
import { useDom } from '../../fixtures'

describe('unhead vue e2e scripts', () => {
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
})
