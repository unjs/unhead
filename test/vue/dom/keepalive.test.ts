// @vitest-environment jsdom
/* eslint-disable vue/one-component-per-file */

import { describe, it } from 'vitest'
import { createHead, injectHead, useHead } from '@unhead/vue'
import { KeepAlive, defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '../util'

describe('keepalive', () => {
  it('keepalive component change', async () => {
    const Comp1 = defineComponent({
      setup() {
        useHead({ title: 'home' })
      },
      render() {
        return '<h1>home</h1>'
      },
    })

    const Comp2 = defineComponent({
      setup() {
        useHead({ title: 'about' })
      },
      render() {
        return '<h1>about</h1>'
      },
    })

    const Provider = defineComponent({
      components: { Comp1, Comp2 },
      setup() {
        const head = ref(injectHead())
        const name = ref('home')
        return { name, head }
      },
      render() {
        const compMap = {
          home: h(Comp1, { ref: 'comp1' }),
          about: h(Comp2, { ref: 'comp2' }),
        }
        return h('div', [
          h(KeepAlive, [
            compMap[this.name as keyof typeof compMap],
          ]),
        ])
      },
    })

    const homeHeadSnapshot = `
      [
        {
          "_d": "title",
          "_e": 0,
          "_p": 0,
          "props": {},
          "tag": "title",
          "textContent": "home",
        },
      ]
    `
    const aboutHeadSnapshot = `
      [
        {
          "_d": "title",
          "_e": 1,
          "_p": 1024,
          "props": {},
          "tag": "title",
          "textContent": "about",
        },
      ]
    `

    /*
      Steps 1 and 2 are used to enable instances of each component,
      and steps 3 and 4 are used to check that the deactivated hooks in `useHead` are working properly.
     */

    // Step 1
    const app = mount(Provider, () => ({ head: createHead() }))
    await nextTick()
    expect(await app.head.resolveTags()).toMatchInlineSnapshot(homeHeadSnapshot)

    // Step 2
    app.name = 'about'
    await nextTick()
    expect(await app.head.resolveTags()).toMatchInlineSnapshot(aboutHeadSnapshot)

    // Step 3
    app.name = 'home'
    await nextTick()
    expect(await app.head.resolveTags()).toMatchInlineSnapshot(homeHeadSnapshot)

    // Step 4
    app.name = 'about'
    await nextTick()
    expect(await app.head.resolveTags()).toMatchInlineSnapshot(aboutHeadSnapshot)
  })
})
