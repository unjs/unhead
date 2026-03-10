import type { PreloadLink, SerializableHead } from '../../src/types'
import { useHead, useHeadSafe, useSeoMeta } from '../../src/composables'
import { createHead } from '../../src/server'

describe('types', () => {
  it('types useHead', () => {
    const unhead = createHead()
    useHead(unhead, {
      htmlAttrs: {
        // @ts-expect-error expected
        foo: 'bla',
        lang: () => false,
      },
      base: {
        href: '/base',
        // @ts-expect-error expected
        uuuu: '',
      },
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
  it('types preload link enforces `as` via PreloadLink', () => {
    const head = createHead()

    // Valid: preload with `as`
    useHead(head, {
      link: [
        { rel: 'preload', href: '/font.woff2', as: 'font', crossorigin: 'anonymous' },
        { rel: 'preload', href: '/script.js', as: 'script' },
        { rel: 'preload', href: '/style.css', as: 'style' },
        { rel: 'preload', href: '/video.mp4', as: 'video' },
      ],
    })

    // Valid: modulepreload (`as` is optional — browser infers script)
    useHead(head, {
      link: [
        { rel: 'modulepreload', href: '/module.js' },
      ],
    })

    // The `PreloadLink` type directly enforces `as` as required.
    // Typing a variable as `PreloadLink` (or one of its subtypes) correctly
    // rejects missing `as` at the type level:
    const validPreloadLink: PreloadLink = { rel: 'preload', href: '/font.woff2', as: 'font', crossorigin: 'anonymous' }
    // @ts-expect-error `as` is required for PreloadLink
    const invalidPreloadLink: PreloadLink = { rel: 'preload', href: '/font.woff2' }

    void validPreloadLink
    void invalidPreloadLink
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
