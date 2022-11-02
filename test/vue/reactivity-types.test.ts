import { computed, createSSRApp, ref } from 'vue'
import { renderToString } from '@vue/server-renderer'
import type { UseHeadInput } from '@vueuse/head'
import { createHead, renderHeadToString, useHead } from '../src'
import type { HeadObjectPlain } from '../src/types'
import { ssrRenderHeadToString } from './shared/utils'

describe('reactivity', () => {
  test('basic', async () => {
    const titleTemplate = ref('%s - My site')

    const headResult = await ssrRenderHeadToString(() => useHead({
      title: 'hello',
      titleTemplate,
      htmlAttrs: {
        lang: ref('zh'),
      },
      bodyAttrs: {
        'data-some-body-attr': 'some-value',
      },
      meta: [
        {
          name: 'description',
          content: ref('test'),
        },
        {
          name: 'description',
          content: 'desc 2',
        },
        {
          property: 'og:locale:alternate',
          content: 'fr',
          key: 'fr',
        },
        {
          property: 'og:locale:alternate',
          content: 'zh',
          key: 'zh',
        },
      ],
      link: [
        {
          as: 'style',
          href: '/style.css',
        },
      ],
      style: [
        {
          children: '* { color: red }',
          body: true,
        },
      ],
      script: [
        {
          key: 'foo-script',
          src: 'foo.js',
        },
      ],
    }))

    expect(headResult).toMatchInlineSnapshot(`
      {
        "bodyAttrs": " data-some-body-attr=\\"some-value\\" data-head-attrs=\\"data-some-body-attr\\"",
        "bodyTags": "<style data-meta-body>* { color: red }</style>",
        "headTags": "<title>hello - My site</title><meta name=\\"description\\" content=\\"desc 2\\"><meta property=\\"og:locale:alternate\\" content=\\"fr\\"><meta property=\\"og:locale:alternate\\" content=\\"zh\\"><link as=\\"style\\" href=\\"/style.css\\"><script src=\\"foo.js\\"></script><meta name=\\"head:count\\" content=\\"5\\">",
        "htmlAttrs": " lang=\\"zh\\" data-head-attrs=\\"lang\\"",
      }
    `)
    expect(headResult.htmlAttrs).toEqual(' lang="zh" data-head-attrs="lang"')
  })

  test('computed', async () => {
    const head = createHead()
    const app = createSSRApp({
      setup() {
        const title = ref('')
        useHead({
          title: title.value,
        })
        title.value = 'hello'
        return () => '<div>hi</div>'
      },
    })
    app.use(head)
    await renderToString(app)

    const headResult = await renderHeadToString(head)
    expect(headResult.headTags).toMatchInlineSnapshot(
      '"<title></title><meta name=\\"head:count\\" content=\\"0\\">"',
    )
  })

  test('reactive', async () => {
    const head = createHead()
    const app = createSSRApp({
      setup() {
        const title = ref('')
        const scripts = ref<Required<HeadObjectPlain>['script']>([])
        const urlMeta = computed<Required<HeadObjectPlain>['meta'][number]>(
          () => {
            return {
              property: 'og:url',
              content: 'test',
            }
          },
        )
        useHead({
          title,
          htmlAttrs: {
            lang: 'test',
            dir: 'ltr',
          },
          meta: [
            {
              'name': 'description',
              'content': () => `${title.value} this is my description`,
              'data-unknown-attr': 'test',
            },
            {
              property: 'og:fake-prop',
              content: 'test',
            },
            {
              name: 'fake-name-prop',
              content: 'test',
            },
            urlMeta,
          ],
          script: scripts,
        })
        scripts.value.push({
          src: 'foo.js',
        })
        title.value = 'hello'
        return () => '<div>hi</div>'
      },
    })
    app.use(head)
    await renderToString(app)

    const headResult = await renderHeadToString(head)
    expect(headResult.headTags).toMatchInlineSnapshot(
      '"<title>hello</title><meta name=\\"description\\" content=\\"hello this is my description\\" data-unknown-attr=\\"test\\"><meta property=\\"og:fake-prop\\" content=\\"test\\"><meta name=\\"fake-name-prop\\" content=\\"test\\"><meta property=\\"og:url\\" content=\\"test\\"><script src=\\"foo.js\\"></script><meta name=\\"head:count\\" content=\\"5\\">"',
    )
  })

  test('computed getter entry', async () => {
    const headResult = await ssrRenderHeadToString(() => useHead(() => ({
      title: 'test',
    })))
    expect(headResult.headTags).toMatchInlineSnapshot(
      '"<title>test</title><meta name=\\"head:count\\" content=\\"0\\">"',
    )
  })

  test('computed getter entries', async () => {
    const test = ref('test')
    const input: UseHeadInput = {
      title: () => 'my title',
      script: () => {
        return [
          {
            src: 'foo.js',
          },
        ]
      },
      meta: [
        () => ({
          name: test.value,
          content: test.value,
        }),
        {
          name: () => `some-flag-${test.value}`,
          content: 'test',
        },
        {
          property: 'og:fake-prop',
          content: () => test.value,
        },
      ],
    }
    const headResult = await ssrRenderHeadToString(() => useHead(input))
    expect(headResult.headTags).toMatchInlineSnapshot(
      '"<title>my title</title><script src=\\"foo.js\\"></script><meta name=\\"test\\" content=\\"test\\"><meta name=\\"some-flag-test\\" content=\\"test\\"><meta property=\\"og:fake-prop\\" content=\\"test\\"><meta name=\\"head:count\\" content=\\"4\\">"',
    )
    test.value = 'test2'
    const headResult2 = await ssrRenderHeadToString(() => useHead(input))
    expect(headResult2.headTags).toMatchInlineSnapshot(
      '"<title>my title</title><script src=\\"foo.js\\"></script><meta name=\\"test2\\" content=\\"test2\\"><meta name=\\"some-flag-test2\\" content=\\"test\\"><meta property=\\"og:fake-prop\\" content=\\"test2\\"><meta name=\\"head:count\\" content=\\"4\\">"',
    )
  })

  test('malformed', async () => {
    const headResult = await ssrRenderHeadToString(() =>
      useHead({
        title() {
          return 'my title'
        },
        meta: [
          {
            // @ts-expect-error number is not valid for name
            'name': 123,
            'data-unknown-attr': 'test',
            // @ts-expect-error meta cannot have children
            'children': 'test',
          },
          {
            name: 'some-flag',
            // @ts-expect-error boolean is not valid for name
            content: true,
          },
          {
            property: 'og:fake-prop',
            // @ts-expect-error arrays not allowed
            content: ['test1', 'test2'],
          },
        ],
      },
      ))
    expect(headResult.headTags).toMatchInlineSnapshot(
      '"<title>my title</title><meta name=\\"123\\" data-unknown-attr=\\"test\\"><meta name=\\"some-flag\\" content><meta property=\\"og:fake-prop\\" content=\\"test1,test2\\"><meta name=\\"head:count\\" content=\\"3\\">"',
    )
  })
})
