// @vitest-environment jsdom
/* eslint-disable vue/one-component-per-file */

import { describe, it } from 'vitest'
import {createHead, injectHead, useHead} from '@unhead/vue'
import { defineComponent, nextTick, ref, onMounted} from 'vue'
import {mount} from "../util";

describe('vue jsdom classes', () => {
  it('reactive string class', async () => {
    const Comp1 = defineComponent({
      setup() {
        const theme = ref('dark')

        useHead({
          htmlAttrs: {
            class: theme
          }
        })

        onMounted(() => {
          theme.value = 'light'
        })
      },
      render() {
        return '<h1>home</h1>'
      },
    })

    mount(Comp1, () => ({ head: createHead() }))
    await nextTick()
    expect(await injectHead().resolveTags()).toMatchInlineSnapshot(`
      [
        {
          "_d": "htmlAttrs",
          "_e": 0,
          "_p": 0,
          "props": {
            "class": "light",
          },
          "tag": "htmlAttrs",
        },
      ]
    `)
  })

})
