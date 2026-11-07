import type { CompiledTags } from 'unhead/compiled/server'
import type { SSRHeadPayload } from 'unhead/types'
import type { RawInput, SerializableHead } from '../../src/'
import { createHead } from '@unhead/vue/client'
import { createHead as createCompiledServerHead, prepareHeadInput } from '@unhead/vue/compiled/server'
import { createHead as createStrictServerHead } from '@unhead/vue/compiled/server-strict'
import { createHead as createServerHead } from '@unhead/vue/server'
import { dynamicValue } from 'unhead/compiled/compile'
import { expectTypeOf } from 'vitest'
import { computed } from 'vue'
import { useHead, useHeadSafe } from '../../src/composables'
import { createStreamableHead } from '../../src/stream/server'

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
          // @ts-expect-error not allowed
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
    useHead(input as any, { head })
  })
  it('types render() return types', () => {
    // client render() returns boolean
    const clientHead = createHead()
    clientHead.render() satisfies boolean

    // server render() returns SSRHeadPayload
    const serverHead = createServerHead()
    serverHead.render() satisfies SSRHeadPayload

    // @ts-expect-error server render() should not be assignable to boolean
    serverHead.render() satisfies boolean
  })
  it('does not accept custom server prop resolvers', () => {
    // @ts-expect-error Vue installs its own prop resolver
    createServerHead({ propResolvers: [] })
    // @ts-expect-error Vue installs its own prop resolver
    createStreamableHead({ propResolvers: [] })
  })
  it('types compiled tag pushes on the strict server head', () => {
    const head = createStrictServerHead()
    const compiledTags = [] as unknown as CompiledTags
    head.push(compiledTags)
    head.push(compiledTags, { values: ['x'] })
    // @ts-expect-error a strict head takes compiled tags only
    expect(() => head.push({ title: 'loose' })).toThrow('compiled tags only')
    expectTypeOf(head.push(compiledTags).dispose).toBeFunction()
  })

  it('types compiled tag pushes on the compiled server head', () => {
    const head = createCompiledServerHead({ disableDefaults: true })
    const compiledTags: CompiledTags = [['title', 0, 10, 'title', { textContent: dynamicValue(0) }, 5]]
    head.push(compiledTags, { values: ['Title'] })
    head.push(compiledTags, { values: [1], tagPriority: 'high' })
    head.push({ title: 'loose' })
    expectTypeOf(head.push).toBeCallableWith(compiledTags, { values: ['Title'] })
    // @ts-expect-error values are a list
    expectTypeOf(head.push).toBeCallableWith(compiledTags, { values: 'Title' })
    // the high priority entry wins, with its value
    expect(head.render().headTags).toBe('<title>1</title>')
  })
  it('types prepareHeadInput literals for a compiled server head push', () => {
    const head = createCompiledServerHead({ disableDefaults: true })
    head.push(prepareHeadInput({ link: [{ rel: 'stylesheet', href: '/a.css' }], htmlAttrs: { lang: 'en' } }))
    expect(head.render().headTags).toBe('<link rel="stylesheet" href="/a.css">')
  })
  it('types nuxt core', () => {
    const payloadURL = 'test'
    const link: RawInput<'link'> = process.env.NUXT_JSON_PAYLOADS
      ? { rel: 'preload', as: 'fetch', crossorigin: 'anonymous', href: payloadURL }
      : { rel: 'modulepreload', crossorigin: '', href: payloadURL }
    const script: RawInput<'script'>[] = [
      { src: payloadURL, type: 'module' },
      { innerHTML: 'foo' },
    ]
    const head = createHead()
    head.push({
      link: [link] as any,
      script: script as any,
    })
  })
})
