import { renderDOMHead } from '@unhead/dom'
import { describe, it } from 'vitest'
import { useDom } from '../../../../unhead/test/fixtures'
import { useHead } from '../../../src'
import { csrVueAppWithUnhead } from '../../util'

describe('vue i18n', () => {
  it('ssr / csr hydration', async () => {
    const dom = useDom()

    const csrHead = csrVueAppWithUnhead(dom, () => {
    })

    const entry = useHead({
      htmlAttrs: {
        dir: 'ltr',
        lang: 'fr',
      },
      link: [
        {
          id: 'i18n-alt-en',
          rel: 'alternate',
          href: 'http://localhost:3000/about',
          hreflang: 'en',
        },
        {
          id: 'i18n-alt-fr',
          rel: 'alternate',
          href: 'http://localhost:3000/fr/about',
          hreflang: 'fr',
        },
        {
          id: 'i18n-alt-ja',
          rel: 'alternate',
          href: 'http://localhost:3000/ja/about',
          hreflang: 'ja',
        },
        {
          id: 'i18n-alt-ja-JP',
          rel: 'alternate',
          href: 'http://localhost:3000/ja/about',
          hreflang: 'ja-JP',
        },
        {
          id: 'i18n-alt-nl',
          rel: 'alternate',
          href: 'http://localhost:3000/nl/about',
          hreflang: 'nl',
        },
        {
          id: 'i18n-alt-nl-NL',
          rel: 'alternate',
          href: 'http://localhost:3000/nl/about',
          hreflang: 'nl-NL',
        },
        {
          id: 'i18n-alt-kr',
          rel: 'alternate',
          href: 'http://localhost:3000/kr/about',
          hreflang: 'kr',
        },
        {
          id: 'i18n-alt-kr-KO',
          rel: 'alternate',
          href: 'http://localhost:3000/kr/about',
          hreflang: 'kr-KO',
        },
        {
          id: 'i18n-xd',
          rel: 'alternate',
          href: 'http://localhost:3000/about',
          hreflang: 'x-default',
        },
        {
          id: 'i18n-can',
          rel: 'canonical',
          href: 'http://localhost:3000/fr/about',
        },
      ],
      meta: [
        {
          id: 'i18n-og-url',
          property: 'og:url',
          content: 'http://localhost:3000/fr/about',
        },
        {
          id: 'i18n-og',
          property: 'og:locale',
          content: 'fr',
        },
        {
          id: 'i18n-og-alt-en',
          property: 'og:locale:alternate',
          content: 'en',
        },
        {
          id: 'i18n-og-alt-ja-JP',
          property: 'og:locale:alternate',
          content: 'ja_JP',
        },
        {
          id: 'i18n-og-alt-nl-NL',
          property: 'og:locale:alternate',
          content: 'nl_NL',
        },
        {
          id: 'i18n-og-alt-kr-KO',
          property: 'og:locale:alternate',
          content: 'kr_KO',
        },
      ],
    }, { head: csrHead })

    renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).includes('i18n-og-alt-ja-JP')

    entry.patch({
      htmlAttrs: {
        dir: 'ltr',
        lang: 'fr',
      },
      link: [
        {
          id: 'i18n-alt-en',
          rel: 'alternate',
          href: 'http://localhost:3000/about',
          hreflang: 'en',
        },
        {
          id: 'i18n-alt-fr',
          rel: 'alternate',
          href: 'http://localhost:3000/fr/about',
          hreflang: 'fr',
        },
        {
          id: 'i18n-alt-ja',
          rel: 'alternate',
          href: 'http://localhost:3000/ja/about',
          hreflang: 'ja',
        },
        {
          id: 'i18n-alt-ja-JP',
          rel: 'alternate',
          href: 'http://localhost:3000/ja/about',
          hreflang: 'ja-JP',
        },
        {
          id: 'i18n-alt-kr',
          rel: 'alternate',
          href: 'http://localhost:3000/kr/about',
          hreflang: 'kr',
        },
        {
          id: 'i18n-alt-kr-KO',
          rel: 'alternate',
          href: 'http://localhost:3000/kr/about',
          hreflang: 'kr-KO',
        },
        {
          id: 'i18n-xd',
          rel: 'alternate',
          href: 'http://localhost:3000/about',
          hreflang: 'x-default',
        },
        {
          id: 'i18n-can',
          rel: 'canonical',
          href: 'http://localhost:3000/fr/about',
        },
      ],
      meta: [
        {
          id: 'i18n-og-url',
          property: 'og:url',
          content: 'http://localhost:3000/fr/about',
        },
        {
          id: 'i18n-og',
          property: 'og:locale',
          content: 'fr',
        },
        {
          id: 'i18n-og-alt-en',
          property: 'og:locale:alternate',
          content: 'en',
        },
        {
          id: 'i18n-og-alt-ja-JP',
          property: 'og:locale:alternate',
          content: 'ja_JP',
        },
        {
          id: 'i18n-og-alt-kr-KO',
          property: 'og:locale:alternate',
          content: 'kr_KO',
        },
      ],
    })

    renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).includes('i18n-og-alt-ja-JP')
  })
})
