import { createHead } from '@unhead/vue/client'
import { computed } from 'vue'
import { useHead } from '../../src/composables'

describe('types', () => {
  it('types useHead', () => {
    const head = createHead()
    useHead({
      htmlAttrs: {
        lang: () => false,
        class: {
          foo: () => false,
          something: computed(() => true),
        },
      },
      base: { href: () => '/base' },
      link: () => [],
      meta: [
        { key: 'key', name: 'description', content: 'some description ' },
        () => ({ key: 'key', name: 'description', content: 'some description ' }),
      ],
      script: [
        () => 'test',
        {
          innerHTML: () => 'foo',
        },
      ],
      style: () => [
        () => 'foo',
      ],
      titleTemplate: (titleChunk) => {
        return titleChunk ? `${titleChunk} - Site Title` : 'Site Title'
      },
    }, {
      head,
    })

    useHead(() => ({
      title: 'foo',
    }), {
      head,
    })
  })
})
