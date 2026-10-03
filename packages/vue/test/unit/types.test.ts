import type { SSRHeadPayload } from 'unhead/types'
import type { RawInput, SerializableHead } from '../../src/'
import type { injectHead } from '../../src/composables'
import { createHead } from '@unhead/vue/client'
import { createHead as createServerHead } from '@unhead/vue/server'
import { createStreamableHead } from '@unhead/vue/stream/client'
import { createStreamableHead as createStreamableServerHead } from '@unhead/vue/stream/server'
import { computed, ref } from 'vue'
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
  it('keeps Vue reactivity at the useHead interface', () => {
    const clientHead = createHead()
    const title = ref('Reactive title')

    useHead({ title }, { head: clientHead })
    useHead(computed(() => ({ title: title.value })), { head: clientHead })
    clientHead.push({ title: () => title.value })

    // @ts-expect-error Vue refs require useHead() on the client
    clientHead.push({ title })
    // @ts-expect-error Root Vue refs require useHead() on the client
    clientHead.push(ref({ title: 'Reactive title' }))
    // @ts-expect-error Vue computed entries require useHead() on the client
    clientHead.push(computed(() => ({ title: title.value })))

    // @ts-expect-error Injected client heads expose the same raw input contract
    const injectedInput: Parameters<ReturnType<typeof injectHead>['push']>[0] = { title }
    void injectedInput

    const streamHead = createStreamableHead()
    streamHead?.push({ title: () => title.value })
    // @ts-expect-error Vue refs require useHead() on the streaming client
    streamHead?.push({ title })

    const serverHead = createServerHead()
    serverHead.push({ title })
    serverHead.push(computed(() => ({ title: title.value })))
    // @ts-expect-error Vue server heads own the Vue resolver chain
    createServerHead({ propResolvers: [] })

    const { head: streamServerHead } = createStreamableServerHead()
    streamServerHead.push({ title })
    streamServerHead.push(computed(() => ({ title: title.value })))
    // @ts-expect-error Stream server heads retain a concrete input schema
    streamServerHead.push({ invalid: true })
    // @ts-expect-error Vue stream server heads own the Vue resolver chain
    createStreamableServerHead({ propResolvers: [] })
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
