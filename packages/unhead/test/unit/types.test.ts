import { useHead, useHeadSafe, useSeoMeta } from '../../src/composables'
import { createHead } from '../../src/server'

describe('types', () => {
  it('types useHead', () => {
    const unhead = createHead()
    useHead(unhead, {
      htmlAttrs: {
        lang: () => false,
      },
      base: { href: '/base' },
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
})
