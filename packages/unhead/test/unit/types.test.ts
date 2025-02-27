import type { SerializableHead } from '../../src/types'
import { useHead, useHeadSafe, useSeoMeta } from '../../src/composables'
import { createHead } from '../../src/server'

describe('types', () => {
  it('types useHead', () => {
    const unhead = createHead()
    useHead(unhead, {
      htmlAttrs: {
        lang: () => false,
      },
      // @ts-expect-error expected
      base: { href: '/base', uuuu: '' },
      link: () => [],
      meta: [
        // @ts-expect-error expected
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
    })
  })
  it('types useHeadSafe', () => {
    const head = createHead()
    useHeadSafe(head, {
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
  it('types useSeoMeta', () => {
    const head = createHead()
    useSeoMeta(head, {
      description: () => 'hello world',
      robots: {
        index: () => true,
      },
    })
  })
  it('types SerializableHead', () => {
    const head = createHead()
    const input = {
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
        // @ts-expect-error testing validation
        foo: 'bla',
        lang: 'en',
        class: 'dark',
      },
      // Validate body attributes
      bodyAttrs: {
        class: 'bg-gray-100',
      },
      wefwefe: 'wefef',
      broken: 'foo',
    } satisfies SerializableHead
    useHead(head, input)
  })
})
