import type { V4Head } from '../packages/unhead/src/v4/core'
/**
 * Quantifies the L2 compat surface: what the three resolve-slot plugins cost
 * per render, and useSeoMeta expansion cost, v3 vs v4.
 */
import { bench, describe } from 'vitest'
import { useSeoMeta as useSeoMetaV3 } from '../packages/unhead/src'
import {
  CanonicalPlugin as CanonicalPluginV3,
  InferSeoMetaPlugin as InferSeoMetaPluginV3,
  TemplateParamsPlugin as TemplateParamsPluginV3,
} from '../packages/unhead/src/plugins'
import { createHead as createV3, renderSSRHead as renderV3 } from '../packages/unhead/src/server'
import {
  CanonicalPlugin,
  InferSeoMetaPlugin,
  TemplateParamsPlugin,
  useTemplateParams,
} from '../packages/unhead/src/v4/plugins'
import { useSeoMeta } from '../packages/unhead/src/v4/seo'
import { createHead as createV4, renderSSRHead as renderV4 } from '../packages/unhead/src/v4/server'
import { applyPage } from './v4/fixtures'

const SEO_INPUT = {
  title: 'About',
  titleTemplate: '%s · Harlan Wilton',
  description: 'Open source developer.',
  ogTitle: 'About',
  ogDescription: 'Open source developer.',
  ogType: 'website',
  ogUrl: 'https://harlanzw.com/about',
  ogSiteName: 'Harlan Wilton',
  ogImage: [{ url: 'https://harlanzw.com/og.png', width: 1200, height: 600, alt: 'My Image' }],
  twitterCard: 'summary_large_image' as const,
  twitterSite: '@harlan_zw',
  robots: { index: true, follow: true },
}

function withPlugins(head: V4Head): V4Head {
  head.use(TemplateParamsPlugin)
  head.use(InferSeoMetaPlugin())
  head.use(CanonicalPlugin({ canonicalHost: 'https://harlanzw.com' }))
  useTemplateParams(head, { separator: '·', siteName: 'Harlan Wilton' })
  return head
}

// plugin overhead on the shared typical page: create + push + render
describe('ssr typical page e2e: plugin overhead', () => {
  bench('v4 no plugins', () => {
    const head = createV4()
    applyPage((input, opts) => head.push(input, opts))
    renderV4(head)
  })
  bench('v4 + templateParams + inferSeoMeta + canonical', () => {
    const head = withPlugins(createV4())
    applyPage((input, opts) => head.push(input, opts))
    renderV4(head)
  })
  bench('v3 + templateParams + inferSeoMeta + canonical', () => {
    const head = createV3({
      plugins: [TemplateParamsPluginV3, InferSeoMetaPluginV3(), CanonicalPluginV3({ canonicalHost: 'https://harlanzw.com' })],
    })
    applyPage((input, opts) => head.push(input, opts))
    renderV3(head, { omitLineBreaks: true })
  })
})

// render-only: isolates the per-render resolve-slot cost from push/compile
describe('ssr resolve+render only: plugin overhead', () => {
  const bare = createV4()
  applyPage((input, opts) => bare.push(input, opts))
  const loaded = withPlugins(createV4())
  applyPage((input, opts) => loaded.push(input, opts))
  const v3Loaded = createV3({
    plugins: [TemplateParamsPluginV3, InferSeoMetaPluginV3(), CanonicalPluginV3({ canonicalHost: 'https://harlanzw.com' })],
  })
  applyPage((input, opts) => v3Loaded.push(input, opts))

  bench('v4 no plugins', () => {
    renderV4(bare)
  })
  bench('v4 all 3 plugins', () => {
    renderV4(loaded)
  })
  bench('v3 all 3 plugins', () => {
    renderV3(v3Loaded, { omitLineBreaks: true })
  })
})

// flat meta expansion + render e2e
describe('ssr useSeoMeta e2e', () => {
  bench('v3', () => {
    const head = createV3()
    useSeoMetaV3(head, SEO_INPUT)
    renderV3(head, { omitLineBreaks: true })
  })
  bench('v4', () => {
    const head = createV4()
    useSeoMeta(head, SEO_INPUT)
    renderV4(head)
  })
})
