import { createHead } from '@unhead/vue/client'
import { computed } from 'vue'
import { useHead, useHeadSafe } from '../../src/composables'

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
        style: {
          color: 'beige',
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
      templateParams: {
        separator: () => '|',
        title: 'foo',
      },
    }, {
      head,
    })

    useHead(() => ({
      title: 'foo',
    }), {
      head,
    })
    useHead({
      htmlAttrs: {
        style: [
          {
            color: 'olive',
          },
          {
            color: 'blue',
          },
        ],
        class: [
          {
            foo: true,
          },
          {
            bar: true,
          },
        ],
      },
      style: [
        '/* Custom styles */',
        'h1 { color: salmon; }',
      ],
    }, {
      head,
    })
  })
  it('types useHeadSafe', () => {
    const head = createHead()
    useHeadSafe({
      script: [
        {
          type: 'application/json',
          id: 'xss-script',
          innerHTML: 'alert("xss")',
        },
      ],
      meta: [
        {
          // @ts-expect-error not allowed
          'http-equiv': 'refresh',
          'content': '0;javascript:alert(1)',
        },
      ],
    }, { head })
  })
})
