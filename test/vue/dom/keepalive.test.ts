// @vitest-environment jsdom

import { describe, it } from 'vitest'
import { createHead, injectHead, useHead } from '@unhead/vue'
import { nextTick, ref } from 'vue'
import { useKeepAliveSetup } from '../util'

describe('keepalive', () => {
  it('basic', async () => {
    const wrapper = useKeepAliveSetup(
      () => {
        const title = ref('hello')
        useHead({ title })
        const head = ref(injectHead())

        return { title, head }
      },
      () => ({ head: createHead() }),
    )

    const comp = wrapper.$refs.comp as any

    expect(await comp.head!.resolveTags()).toMatchInlineSnapshot(`
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
    expect(await comp.head!.resolveTags()).toMatchInlineSnapshot(`
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
    expect(await comp.head!.resolveTags()).toMatchInlineSnapshot(`
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

    wrapper.visible = true
    expect(await comp.head!.resolveTags()).toMatchInlineSnapshot(`
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
  })
})
