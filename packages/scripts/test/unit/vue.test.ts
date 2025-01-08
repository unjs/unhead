<<<<<<<< HEAD:packages/scripts/test/unit/vue.test.ts
import { createHead } from '@unhead/vue'
import { describe, it } from 'vitest'
import { ref, watch } from 'vue'
import { useDom } from '../../../../test/fixtures'
import { useScript } from '../../src/vue/useScript'
========
import { useScript } from '@unhead/vue'
import { createHead } from '@unhead/vue/client'
import { describe, it } from 'vitest'
import { ref, watch } from 'vue'
import { useDom } from '../../../../test/fixtures'
>>>>>>>> 66a46616e56fafd065452f45f611986a3f36b5cc:packages/vue/test/e2e/scripts.test.ts

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
})
