/**
 * Shared workload for v3 vs v4 benches and parity tests.
 * A realistic Nuxt-style page: app config, styles, resource hints,
 * body scripts, SEO meta set, per-page overrides. ~45 tags, 8 entries.
 */
import type { EntryOptions, PlanTag, Tag } from '../../packages/unhead/src/v4/core'
import { compileEntry } from '../../packages/unhead/src/v4/compile'
import { F_ARRAYABLE, F_ID, F_POS, POS_SHIFT, T_BODY_ATTRS, T_HTML_ATTRS } from '../../packages/unhead/src/v4/core'
import { propsToString, tagToHtml } from '../../packages/unhead/src/v4/server'

type Push = (input: any, opts?: EntryOptions) => void

// [input, opts, static] — static entries are eligible for plan precompilation
export const ENTRIES: [Record<string, any>, EntryOptions | undefined, boolean][] = [
  // 1. nuxt.config app.head
  [{
    htmlAttrs: { lang: 'en', class: 'dark' },
    script: [{ 'src': 'https://analytics.example.com/script.js', 'data-site': 'VDJUVDNA', 'data-spa': 'auto', 'defer': true, 'key': 'analytics' }],
  }, undefined, true],
  // 2. styles + resource hints
  [{
    link: [
      { rel: 'stylesheet', href: '/entry.css' },
      { rel: 'stylesheet', href: '/page.css' },
      { rel: 'stylesheet', href: '/page2.css' },
      { rel: 'stylesheet', href: '/page3.css' },
      { rel: 'stylesheet', href: '/page4.css' },
      { rel: 'preload', as: 'script', href: '/_nuxt/runtime.js' },
      { rel: 'preload', as: 'script', href: '/_nuxt/vendors.js' },
      { rel: 'preload', as: 'script', href: '/_nuxt/app.js' },
      { rel: 'preload', as: 'fetch', href: '/payload.json', crossorigin: '' },
    ],
  }, undefined, true],
  // 3. app scripts at body close
  [{
    script: [
      { type: 'module', src: '/_nuxt/module.js', crossorigin: '' },
      { src: '/_nuxt/legacy.js', defer: true, crossorigin: '' },
    ],
  }, { tagPosition: 'bodyClose' }, true],
  // 4. payload
  [{
    script: [{ innerHTML: { data: { page: { title: 'About' } }, state: { user: null } } }],
  }, { tagPosition: 'bodyClose', tagPriority: 'high' }, true],
  // 5. site defaults (nuxt-seo style)
  [{
    titleTemplate: '%s · Harlan Wilton',
    bodyAttrs: { class: 'antialiased font-sans' },
    link: [{ rel: 'canonical', href: 'https://harlanzw.com/about' }],
    meta: [
      { name: 'description', content: 'Open source developer.' },
      { name: 'robots', content: 'index, follow' },
    ],
  }, { tagPriority: 101 }, false],
  // 6. seo meta set
  [{
    meta: [
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://harlanzw.com/about' },
      { property: 'og:locale', content: 'en' },
      { property: 'og:site_name', content: 'Harlan Wilton' },
      { property: 'og:title', content: 'About' },
      { property: 'og:description', content: 'Open source developer.' },
      { property: 'og:image', content: 'https://harlanzw.com/__og-image__/og.png' },
      { property: 'og:image:type', content: 'image/png' },
      { property: 'og:image:width', content: 1200 },
      { property: 'og:image:height', content: 600 },
      { property: 'og:image:alt', content: 'My Image' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:creator', content: '@harlan_zw' },
      { name: 'twitter:site', content: '@harlan_zw' },
      { name: 'twitter:image', content: 'https://harlanzw.com/__og-image__/og.png' },
      { name: 'twitter:image:width', content: 1200 },
      { name: 'twitter:image:height', content: 600 },
    ],
  }, undefined, true],
  // 7. page-level overrides
  [{
    title: 'About',
    meta: [{ name: 'description', content: 'About Harlan Wilton, open source developer.' }],
  }, undefined, false],
]

export function applyPage(push: Push) {
  for (const [input, opts] of ENTRIES) push(input, opts)
}

export const SIMPLE: Record<string, any> = {
  title: 'Harlan Wilton',
  script: [{ 'src': 'https://analytics.example.com/script.js', 'data-spa': 'auto', 'defer': true }],
}

/** Simulate the bundler's plan emitter: compile an entry and serialize to tuples. */
export function toPlan(input: any, opts?: EntryOptions): PlanTag[] {
  return compileEntry(input, 0, opts || null).map((t: Tag) => {
    const id = t.f & F_ID
    if (id === T_HTML_ATTRS || id === T_BODY_ATTRS)
      return [t.w, t.d, propsToString(t.p!), id === T_HTML_ATTRS ? 3 : 4] as PlanTag
    const pf = (t.f & F_POS) >> POS_SHIFT | (t.f & F_ARRAYABLE ? 8 : 0)
    return pf ? [t.w, t.d, tagToHtml(t), pf] as PlanTag : [t.w, t.d, tagToHtml(t)] as PlanTag
  })
}

// precompiled at module load, as a bundler would emit them (module-hoisted consts)
export const STATIC_PLANS: PlanTag[][] = ENTRIES.filter(e => e[2]).map(e => toPlan(e[0], e[1]))
export const DYNAMIC_ENTRIES = ENTRIES.filter(e => !e[2])

// fully sealed variant: title template pre-applied at build (cross-entry pre-merge),
// description as an attr-mode hole
export const SEALED_PAGE_PLAN: PlanTag[] = [
  ...STATIC_PLANS.flat(),
  [10, 'title', ['<title>', '</title>'], 0b00],
  [101, 'bodyAttrs:class', ' class="antialiased font-sans"', 4],
  [101, 'canonical', '<link rel="canonical" href="https://harlanzw.com/about">'],
  [101, 'meta:robots', '<meta name="robots" content="index, follow">'],
  [100, 'meta:description', ['<meta name="description" content="', '">'], 0b01],
]
export const SEALED_FILLS = ['About · Harlan Wilton', 'About Harlan Wilton, open source developer.']
