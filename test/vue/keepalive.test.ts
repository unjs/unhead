import { describe, it } from 'vitest'
import { createHead, useHead } from '@unhead/vue'
import { nextTick, onActivated, onDeactivated, onMounted, ref } from 'vue'
import { useKeepAliveSetup } from './util'

describe('keepalive', () => {
  it('basic', async () => {
    let head: ReturnType<typeof createHead>
    const wrapper = useKeepAliveSetup(() => {
      head = createHead()
      const title = ref('hello')
      useHead({ title })

      return { title }
    })

    const comp = wrapper.$refs.comp as any

    expect(await head!.resolveTags()).toMatchInlineSnapshot(`
      [
        {
          "_d": "title",
          "_e": 0,
          "_p": 0,
          "children": "hello",
          "props": {},
          "tag": "title",
        },
      ]
    `)

    comp.title = 'world'
    await nextTick()
    expect(await head!.resolveTags()).toMatchInlineSnapshot(`
      [
        {
          "_d": "title",
          "_e": 0,
          "_p": 0,
          "children": "world",
          "props": {},
          "tag": "title",
        },
      ]
    `)

    wrapper.visible = false
    await nextTick()
    comp.title = 'hello'
    await nextTick()
    expect(await head!.resolveTags()).toMatchInlineSnapshot(`
      [
        {
          "_d": "title",
          "_e": 0,
          "_p": 0,
          "children": "world",
          "props": {},
          "tag": "title",
        },
      ]
    `)
  })

  it('test setup', async () => {
    let d = false
    const wr = useKeepAliveSetup(() => {
      onMounted(() => {
        console.log('💬 onMounted')
      })
      onActivated(() => {
        console.log('💬 onActivated')
        d = false
      })
      onDeactivated(() => {
        console.log('💬 onDeactivated')
        d = true
      })
    })

    try {
      await nextTick()
      expect(d).toBe(false)
      wr.visible = false
      await nextTick()
      await nextTick()
      await nextTick()
      expect(d).toBe(true)
      wr.visible = true
      await nextTick()
      expect(d).toBe(false)
    }
    finally {
      wr.unmount()
    }
  })
})
