import type { SerializableHead } from '../../src/'
import { createHead } from '@unhead/vue/client'
import { computed } from 'vue'
import { useHead, useHeadSafe } from '../../src/composables'

describe('types', () => {
  it('types useHead', () => {
    const head = createHead()
    useHead({
      htmlAttrs: {
        // @ts-expect-error should throw a type error
        foer: 'erg',
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
        // @ts-expect-error key should throw a type error
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
  it('types SerializableHead', () => {
    const head = createHead()
    const input: SerializableHead = {
      title: 'Hello',
      meta: [
        { name: 'description', content: 'Static content' },
        { property: 'og:image', content: 'https://example.com/1.jpg' },
      ],
      script: [
        { src: 'https://example.com/script.js' },
      ],
      link: [
        { rel: 'stylesheet', href: 'style1.css' },
      ],
      // Validate HTML attributes
      htmlAttrs: {
        lang: 'en',
        class: 'dark',
      },
      // Validate body attributes
      bodyAttrs: {
        class: 'bg-gray-100',
      },
    }
    useHead(input, { head })
  })
})
