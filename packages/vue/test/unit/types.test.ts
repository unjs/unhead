import type { CreateClientHeadOptions } from '@unhead/vue/client'
import type { CreateServerHeadOptions as VueCreateServerHeadOptions } from '@unhead/vue/server'
import type { CreateStreamableClientHeadOptions } from '@unhead/vue/stream/client'
import type { CreateStreamableServerHeadOptions } from '@unhead/vue/stream/server'
import type { SSRHeadPayload } from 'unhead/types'
import type { RawInput, SerializableHead, UseHeadInput, VueHeadClient } from '../../src/'
import { createHead } from '@unhead/vue/client'
import { createHead as createServerHead } from '@unhead/vue/server'
import { computed } from 'vue'
import { useHead, useHeadSafe, useScript, useSeoMeta } from '../../src/composables'

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
          // @ts-expect-error innerHTML is not allowed in safe script input
          innerHTML: 'alert("xss")',
        },
      ],
    }, { head })
    useHeadSafe({
      meta: [
        {
          // @ts-expect-error http-equiv is not allowed in safe meta input
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
    // the default Vue client renderer is debounced, so render() returns void
    const clientHead = createHead()
    clientHead.render() satisfies void
    createHead({ init: [] }).push satisfies (input: UseHeadInput) => unknown
    createHead({ init: [false, undefined] }).push satisfies (input: UseHeadInput) => unknown

    // @ts-expect-error the debounced renderer does not expose the core boolean result
    clientHead.render() satisfies boolean

    const customClientHead = createHead({ render: head => head.ssr ? 'server' as const : 'rendered' as const })
    customClientHead.render() satisfies 'server' | 'rendered'

    // server render() returns SSRHeadPayload
    const serverHead = createServerHead()
    serverHead.render() satisfies SSRHeadPayload

    // @ts-expect-error server render() should not be assignable to boolean
    serverHead.render() satisfies boolean

    // Vue installs its resolver and does not accept a replacement resolver list.
    // @ts-expect-error propResolvers is intentionally omitted from the wrapper API
    createServerHead({ propResolvers: [] })
  })
  it('preserves explicit entry and script API types', () => {
    interface Input { title: string }
    const exactHead = createHead<Input>()
    const entry = useHead<Input>({ title: 'page' }, { head: exactHead })
    entry.patch({ title: 'next' })
    useHead<Input>({ title: 'broad head' }, { head: createHead() })

    if (false) {
      // @ts-expect-error synthesized safe entries do not provide required title
      useHeadSafe({}, { head: exactHead })
      // @ts-expect-error synthesized SEO entries do not provide required title
      useSeoMeta({}, { head: exactHead })
      // @ts-expect-error synthesized script entries do not provide required title
      useScript('/required.js', { head: exactHead })

      type OptionalInput = UseHeadInput & { custom?: string }
      type UnionInput = UseHeadInput | { custom: string }
      const optionalHead = createHead<OptionalInput>()
      const unionHead = createHead<UnionInput>()
      const customOnlyHead = null as unknown as VueHeadClient<{ custom: string }>
      useHeadSafe({}, { head: optionalHead })
      useSeoMeta({}, { head: optionalHead })
      useScript('/optional.js', { head: optionalHead })
      useHeadSafe({}, { head: unionHead })
      useSeoMeta({}, { head: unionHead })
      useScript('/union.js', { head: unionHead })
      // @ts-expect-error standard entries are incompatible with custom-only heads
      useHeadSafe({}, { head: customOnlyHead })
      // @ts-expect-error standard entries are incompatible with custom-only heads
      useSeoMeta({}, { head: customOnlyHead })
      // @ts-expect-error standard entries are incompatible with custom-only heads
      useScript('/custom.js', { head: customOnlyHead })
    }

    const options: CreateClientHeadOptions<Input> = {}
    createHead(options).render() satisfies void

    const exactServerHead = createServerHead<Input>({ disableDefaults: true })
    exactServerHead.push({ title: 'server' })
    const serverOptions: VueCreateServerHeadOptions<Input> = {}
    createServerHead(serverOptions).push satisfies (input: UseHeadInput) => unknown

    const reactiveInit = [() => ({ title: 'Reactive title' })]
    const vueServerOptions: VueCreateServerHeadOptions = { init: reactiveInit }
    const streamClientOptions: CreateStreamableClientHeadOptions = { init: reactiveInit }
    const streamServerOptions: CreateStreamableServerHeadOptions = { init: reactiveInit }
    void vueServerOptions
    void streamClientOptions
    void streamServerOptions

    // @ts-expect-error Vue owns the server resolver chain
    const invalidServerOptions: VueCreateServerHeadOptions = { propResolvers: [] }
    void invalidServerOptions

    if (false) {
      // @ts-expect-error an explicit entry type requires a matching input
      useHead<Input>()
      // @ts-expect-error exact custom server input requires defaults to be disabled
      createServerHead<Input>()

      const script = useScript<{ lookup: (id: string) => number }>('/script.js')
      script.instance satisfies { lookup: (id: string) => number } | null
      script.onLoaded(() => {}) satisfies () => void
    }
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
