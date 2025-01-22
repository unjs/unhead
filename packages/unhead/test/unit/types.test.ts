import { useHead } from '../../src/composables'
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
})
