import type { Ref } from 'vue'
import { useHead } from '@unhead/vue'
import { describe, it } from 'vitest'
import { ref } from 'vue'
import { ssrVueAppWithUnhead } from '../util'

describe('resolveTags', () => {
  it('basic resolve tags', async () => {
    const head = await ssrVueAppWithUnhead(() => {
      useHead({
        htmlAttrs: { class: 'first-class' },
      })

      useHead({
        htmlAttrs: { class: 'second-class' },
      })
    })

    const tags = head.resolveTags()
    expect(tags).toMatchInlineSnapshot(`
      [
        {
          "_d": "htmlAttrs",
          "_p": 2048,
          "_w": 100,
          "props": {
            "class": Set {
              "first-class",
              "second-class",
            },
          },
          "tag": "htmlAttrs",
        },
      ]
    `)
  })

  it('conditional classes', async () => {
    const head = await ssrVueAppWithUnhead(() => {
      const theme: Ref<'dark' | 'light'> = ref('dark')

      useHead({
        htmlAttrs: {
          class: {
            'layout-theme-dark': () => theme.value === 'dark',
            'layout-theme-light': () => theme.value === 'light',
          },
        },
        bodyAttrs: {
          class: ['test', () => `theme-${theme.value}`],
        },
      })

      const page: Ref<{ name: string }> = ref({ name: 'home' })
      useHead({
        htmlAttrs: {
          class: () => page.value.name,
        },
      })
    })

    const tags = head.resolveTags()
    expect(tags).toMatchInlineSnapshot(`
      [
        {
          "_d": "htmlAttrs",
          "_p": 2048,
          "_w": 100,
          "props": {
            "class": Set {
              "layout-theme-dark",
              "home",
            },
          },
          "tag": "htmlAttrs",
        },
        {
          "_d": "bodyAttrs",
          "_p": 1025,
          "_w": 100,
          "props": {
            "class": Set {
              "test",
              "theme-dark",
            },
          },
          "tag": "bodyAttrs",
        },
      ]
    `)
  })
  it('basic resolve tags #2', async () => {
    const head = await ssrVueAppWithUnhead(() => {
      useHead({
        htmlAttrs: { class: 'first-class' },
      })

      useHead({
        htmlAttrs: { class: 'second-class', tagDuplicateStrategy: 'replace' },
      })
    })

    const tags = head.resolveTags()
    expect(tags).toMatchInlineSnapshot(`
      [
        {
          "_d": "htmlAttrs",
          "_p": 2048,
          "_w": 100,
          "props": {
            "class": Set {
              "second-class",
            },
          },
          "tag": "htmlAttrs",
          "tagDuplicateStrategy": "replace",
        },
      ]
    `)
  })
  it('resolve multiple conditional classes entries', async () => {
    const head = await ssrVueAppWithUnhead(() => {
      useHead({
        htmlAttrs: {
          class: {
            someTrue: true,
          },
        },
      })

      useHead({
        htmlAttrs: {
          class: ['someArrayClass'],
        },
      })

      useHead({
        htmlAttrs: {
          class: {
            someFalsy: false,
          },
        },
      })

      useHead({
        htmlAttrs: {
          class: [],
        },
      })

      useHead({
        htmlAttrs: {
          class: '',
        },
      })
    })

    const tags = head.resolveTags()
    expect(tags).toMatchInlineSnapshot(`
      [
        {
          "_d": "htmlAttrs",
          "_p": 5120,
          "_w": 100,
          "props": {
            "class": Set {
              "someTrue",
              "someArrayClass",
            },
          },
          "tag": "htmlAttrs",
        },
      ]
    `)
  })
})
