// @vitest-environment jsdom

import { describe, it } from 'vitest'
import { createHead, injectHead, useHead } from '@unhead/vue'
import { defineComponent, h, KeepAlive, nextTick, ref } from 'vue'
import { mount } from '../util'

describe('keepalive', () => {
  it('keepalive component change', async () => {
    const Comp1 = defineComponent({
      setup() {
        useHead({ title: 'home' })
      }
    })

    const Comp2 = defineComponent({
      setup() {
        useHead({ title: 'about' })
      }
    })

    const Provider = defineComponent({
      components: { Comp1 },
      setup() {
        const head = ref(injectHead())
        const name = ref('home')
        return { name, head }
      },
      render() {
        return h('div', [h(KeepAlive, [this.name === 'home' ? h(Comp1, { ref: 'comp1' }) : h(Comp2, { ref: 'comp2' })])])
      },
    })

    const app = mount(Provider, () => ({ head: createHead() }))

    // 1
    expect(await app.head.resolveTags()).toMatchInlineSnapshot(`
      [
        {
          "_d": "title",
          "_e": 0,
          "_p": 0,
          "children": "home",
          "props": {},
          "tag": "title",
        },
      ]
    `)

    // 2
    app.name = 'about'
    await nextTick()
    expect(await app.head.resolveTags()).toMatchInlineSnapshot(`
      [
        {
          "_d": "title",
          "_e": 1,
          "_p": 1024,
          "children": "about",
          "props": {},
          "tag": "title",
        },
      ]
    `)

    // 3
    app.name = 'home'
    await nextTick()
    expect(await app.head.resolveTags()).toMatchInlineSnapshot(`
      [
        {
          "_d": "title",
          "_e": 0,
          "_p": 0,
          "children": "home",
          "props": {},
          "tag": "title",
        },
      ]
    `)

    // 4
    app.name = 'about'
    await nextTick()
    expect(await app.head.resolveTags()).toMatchInlineSnapshot(`
      [
        {
          "_d": "title",
          "_e": 1,
          "_p": 1024,
          "children": "about",
          "props": {},
          "tag": "title",
        },
      ]
    `)

    // 5
    app.name = 'home'
    await nextTick()
    expect(await app.head.resolveTags()).toMatchInlineSnapshot(`
      [
        {
          "_d": "title",
          "_e": 0,
          "_p": 0,
          "children": "home",
          "props": {},
          "tag": "title",
        },
      ]
    `)
  })
})
