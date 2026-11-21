import type { Ref } from 'vue'
import { useHead } from '@unhead/vue'
import { ssrRenderTags } from 'unhead/server'
import { resolveTags } from 'unhead/utils'
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

    const tags = resolveTags(head)
    expect(ssrRenderTags(tags).htmlAttrs).toBe(' class="first-class second-class"')
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

    const tags = resolveTags(head)
    const rendered = ssrRenderTags(tags)
    expect(rendered.htmlAttrs).toBe(' class="layout-theme-dark home"')
    expect(rendered.bodyAttrs).toBe(' class="test theme-dark"')
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

    const tags = resolveTags(head)
    expect(ssrRenderTags(tags).htmlAttrs).toBe(' class="second-class"')
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

    const tags = resolveTags(head)
    expect(ssrRenderTags(tags).htmlAttrs).toBe(' class="someTrue someArrayClass"')
  })
})
