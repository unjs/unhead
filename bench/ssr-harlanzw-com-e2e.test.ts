import type { Head } from 'unhead/types'
import { InferSeoMetaPlugin } from '@unhead/addons'
import { definePerson, defineWebPage, defineWebSite, useSchemaOrg } from '@unhead/schema-org/vue'
import { TemplateParamsPlugin } from 'unhead/plugins'
import { describe, it } from 'vitest'
import { useHead, useSeoMeta } from '../packages/vue/src'
import { createHead as createServerHead, renderSSRHead } from '../packages/vue/src/server'

describe('ssr e2e bench', () => {
  it('e2e', async () => {
    // we're going to replicate the logic needed to render the tags for a harlanzw.com page

    // 1. Add nuxt.config meta tags
    const head = createServerHead({
      plugins: [
        TemplateParamsPlugin,
      ],
    })
    // nuxt.config app.head
    head.push({
      title: 'Harlan Wilton',
      templateParams: {
        separator: '·',
      },
      script: [
        {
          'src': 'https://idea-lets-dance.harlanzw.com/script.js',
          'data-spa': 'auto',
          'data-site': 'VDJUVDNA',
          'defer': true,
        },
      ],
    })
    const options = { mode: 'server' } as const
    // 1. payload
    head.push({
      link: [
        // resource hints for vue chunks
        { rel: 'preload', as: 'fetch', href: '/payload.json' },
      ],
    }, options)
    // 2. styles
    head.push({
      link: [
        // page css, assume 5 of so css files
        { rel: 'stylesheet', href: '/page.css' },
        { rel: 'stylesheet', href: '/page2.css' },
        { rel: 'stylesheet', href: '/page3.css' },
        { rel: 'stylesheet', href: '/page4.css' },
        { rel: 'stylesheet', href: '/page5.css' },
      ],
    }, options)
    // 3. resource hints
    head.push({
      link: [
        { rel: 'preload', as: 'script', href: '/_nuxt/runtime.js' },
        { rel: 'preload', as: 'script', href: '/_nuxt/vendors.js' },
        { rel: 'preload', as: 'script', href: '/_nuxt/app.js' },
      ],
    }, options)
    // 4. payloads
    head.push({
      script: [
        // 4. payloads
        { innerHTML: { id: '__NUXT_DATA__', data: { initial: { bar: 'foo' }, payload: { foo: 'bar' } } } },
      ],
    }, {
      ...options,
      tagPosition: 'bodyClose',
      tagPriority: 'high',
    })
    // 5. scripts
    head.push({
      script: [
        {
          type: 'module',
          src: '/module.js',
          tagPosition: 'bodyClose',
          crossorigin: '',
        },
        {
          src: '/non-module.js',
          tagPosition: 'bodyClose',
          defer: true,
          crossorigin: '',
        },
      ],
    }, options)
    // start the vue rendererer
    // Nuxt SEO experiments
    head.use({
      key: 'nuxt-seo-experiments',
      hooks: {
        'tags:resolve': async ({ tags }) => {
          // iterate through tags that require absolute URLs and add the host base
          for (const tag of tags) {
            // og:image and twitter:image need to be absolute
            if (tag.tag !== 'meta')
              continue
            if (tag.props.property !== 'og:image:url' && tag.props.property !== 'og:image' && tag.props.name !== 'twitter:image')
              continue
            if (typeof tag.props.content !== 'string' || !tag.props.content.trim() || tag.props.content.startsWith('http') || tag.props.content.startsWith('//'))
              continue
            tag.props.content = `https://harlanzw.com${tag.props.content}`
          }
        },
      },
    })
    head.use(InferSeoMetaPlugin())
    const input: Head = {
      meta: [],
      templateParams: {
        site: {
          name: 'Harlan Wilton',
          url: 'https://harlanzw.com',
          description: 'Open source developer, contributing to the Vue, Nuxt, and Vite ecosystems.',
        },
        // support legacy
        siteUrl: 'https://harlanzw.com',
        siteName: 'Harlan Wilton',
      },
    }
    input.templateParams!.siteDescription = 'Open source developer, contributing to the Vue, Nuxt, and Vite ecosystems.'
    // we can setup a meta description
    input.meta!.push(
      {
        name: 'description',
        content: '%site.description',
      },
    )
    head.push(input, { tagPriority: 150 })
    // Nuxt SEO
    const minimalPriority = {
      tagPriority: 101,
      head,
    } as const
    // needs higher priority
    useHead({
      link: [{ rel: 'canonical', href: 'https://harlanzw.com/' }],
    }, {
      head,
    })
    useHead({
      htmlAttrs: { lang: 'en' },
    }, {
      head,
    })
    useHead({
      templateParams: { site: {
        name: 'Harlan Wilton',
        url: 'https://harlanzw.com',
        description: 'Open source developer, contributing to the Vue, Nuxt, and Vite ecosystems.',
      }, siteName: 'Harlan Wilton' },
      titleTemplate: '%s %separator %siteName',
    }, minimalPriority)
    useSeoMeta({
      ogType: 'website',
      ogUrl: 'https://harlanzw.com',
      ogLocale: 'en',
      ogSiteName: 'Harlan Wilton',
      description: 'Open source developer, contributing to the Vue, Nuxt, and Vite ecosystems.',
      twitterCreator: '@harlan_zw',
      twitterSite: '@harlan_zw',
    }, { ...minimalPriority, head })
    // inferred from path /about (example)
    useHead({
      title: 'About',
    }, { ...minimalPriority, head })
    // OG Image
    const meta: Head['meta'] = [
      { property: 'og:image', content: 'https://harlanzw.com/__og-image__/og.png' },
      { property: 'og:image:type', content: `image/png` },
      { name: 'twitter:card', content: 'summary_large_image' },
      // we don't need this but avoids issue when using useSeoMeta({ twitterImage })
      { name: 'twitter:image', content: 'https://harlanzw.com/__og-image__/og.png' },
      { name: 'twitter:image:src', content: 'https://harlanzw.com/__og-image__/og.png' },
      { property: 'og:image:width', content: 1200 },
      { name: 'twitter:image:width', content: 1200 },
      { property: 'og:image:height', content: 600 },
      { name: 'twitter:image:height', content: 600 },
      { property: 'og:image:alt', content: 'My Image' },
      { name: 'twitter:image:alt', content: 'My Image' },
    ]
    const script: Head['script'] = [{
      id: 'nuxt-og-image-options',
      type: 'application/json',
      processTemplateParams: true,
      innerHTML: () => {
        const _input: Record<string, any> = {
          props: {
            color: 'red',
          },
        }
        if (typeof _input.props.title === 'undefined')
          _input.props.title = '%s'
        delete _input.url
        // don't apply defaults
        return _input
      },
      // we want this to be last in our head
      tagPosition: 'bodyClose',
    }]
    useHead({
      script,
      meta,
    }, {
      head,
      tagPriority: 35,
    })
    // Schema.org
    head.push({ templateParams: { schemaOrg: {
      url: 'https://harlanzw.com/path',
      host: 'https://harlanzw.com',
      inLanguage: 'en',
      path: '/path',
    } } })
    useSchemaOrg([
      defineWebSite({
        name: 'Harlan Wilton',
        inLanguage: 'en',
        description: 'Open source developer, contributing to the Vue, Nuxt, and Vite ecosystems.',
      }),
      defineWebPage(),
      definePerson({
        name: 'Harlan Wilton',
        url: 'https://harlanzw.com/',
        sameAs: [
          'https://twitter.com/harlan_zw',
        ],
      }),
    ], {
      head,
    })
    // entry
    useHead({
      script: [{
        type: 'application/ld+json',
        key: 'schema-org-graph',
        // @ts-expect-error untyped
        nodes: [],
      }],
    }, {
      head,
    })
    // Robots
    useHead({
      meta: [
        { name: 'robots', content: 'index, follow' },
      ],
    }, {
      head,
    })
    // app.vue
    // (duplicated)
    useSchemaOrg([
      definePerson({
        name: 'Harlan Wilton',
        image: 'https://res.cloudinary.com/dl6o1xpyq/image/upload/f_jpg,q_auto:best,dpr_auto,w_240,h_240/images/harlan-wilton',
        sameAs: [
          'https://twitter.com/harlan_zw',
        ],
      }),
    ], {
      head,
    })
    // [...all].vue
    useSeoMeta({
      title: 'Home',
      description: 'Home page description',
    }, {
      head,
    })
    // index.md
    useSeoMeta({
      title: 'Home',
      description: 'Home page description',
    }, {
      head,
    })

    const { headTags, bodyTags, bodyTagsOpen, htmlAttrs, bodyAttrs } = await renderSSRHead(head, {
      omitLineBreaks: true,
    })
    function normalizeChunks(chunks: (string | undefined)[]) {
      return chunks.filter(Boolean).map(i => i!.trim())
    }
    const htmlContext = {
      htmlAttrs: htmlAttrs ? [htmlAttrs] : [],
      head: normalizeChunks([headTags]),
      bodyAttrs: bodyAttrs ? [bodyAttrs] : [],
      bodyPrepend: normalizeChunks([bodyTagsOpen]),
      bodyAppend: [bodyTags],
    }

    const html = `
<!DOCTYPE html>
<html${htmlContext.htmlAttrs.join(' ')}>
<head>
${htmlContext.head.join('\n')}
</head>
<body${htmlContext.bodyAttrs.join(' ')}>
${htmlContext.bodyPrepend.join('\n')}
${htmlContext.bodyAppend.join('\n')}
</body>
`
    expect(html).toMatchInlineSnapshot(`
      "
      <!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Home · Harlan Wilton</title><meta property="og:image" content="https://harlanzw.com/__og-image__/og.png"><meta property="og:image:type" content="image/png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="https://harlanzw.com/__og-image__/og.png"><meta name="twitter:image:src" content="https://harlanzw.com/__og-image__/og.png"><meta property="og:image:width" content="1200"><meta name="twitter:image:width" content="1200"><meta property="og:image:height" content="600"><meta name="twitter:image:height" content="600"><meta property="og:image:alt" content="My Image"><meta name="twitter:image:alt" content="My Image"><link rel="stylesheet" href="/page.css"><link rel="stylesheet" href="/page2.css"><link rel="stylesheet" href="/page3.css"><link rel="stylesheet" href="/page4.css"><link rel="stylesheet" href="/page5.css"><link rel="preload" as="fetch" href="/payload.json"><link rel="preload" as="script" href="/_nuxt/runtime.js"><link rel="preload" as="script" href="/_nuxt/vendors.js"><link rel="preload" as="script" href="/_nuxt/app.js"><script src="https://idea-lets-dance.harlanzw.com/script.js" data-spa="auto" data-site="VDJUVDNA" defer></script><link rel="canonical" href="https://harlanzw.com/"><meta name="robots" content="index, follow"><meta name="description" content="Home page description"><meta property="og:type" content="website"><meta property="og:url" content="https://harlanzw.com"><meta property="og:locale" content="en"><meta property="og:site_name" content="Harlan Wilton"><meta name="twitter:creator" content="@harlan_zw"><meta name="twitter:site" content="@harlan_zw"><meta property="og:title" data-infer="" content="Home · Harlan Wilton"><meta property="og:description" data-infer="" content="Home page description">
      </head>
      <body>

      <script id="nuxt-og-image-options" type="application/json">{"props":{"color":"red","title":"Home"}}</script><script type="module" src="/module.js" crossorigin></script><script src="/non-module.js" defer crossorigin></script><script type="application/json">{"id":"__NUXT_DATA__","data":{"initial":{"bar":"foo"},"payload":{"foo":"bar"}}}</script><script type="application/ld+json" data-hid="schema-org-graph"></script>
      </body>
      "
    `)
  })
})
