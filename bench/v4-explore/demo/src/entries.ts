/**
 * Shared workload for the real-browser demo. Mirrors bench/v4/fixtures.ts
 * ENTRIES (a realistic Nuxt-style page) but lives here so client bundles do
 * not drag fixtures' module-level plan precompilation (and its v4 server
 * imports) into the v3 bundle.
 *
 * The one intentional difference: the page-level entry (entry 7) carries the
 * full per-route head (title, description, canonical, og set) so the
 * navigation loop can swap all of them symmetrically via patch().
 */

export interface RouteState {
  title: string
  /** title with the site template pre-applied (what a compiler would seal) */
  titleFull: string
  desc: string
  canonical: string
  ogTitle: string
  ogDesc: string
  ogUrl: string
}

export const ROUTES: Record<'a' | 'b', RouteState> = {
  a: {
    title: 'About',
    titleFull: 'About · Harlan Wilton',
    desc: 'About Harlan Wilton, open source developer.',
    canonical: 'https://harlanzw.com/about',
    ogTitle: 'About',
    ogDesc: 'Open source developer.',
    ogUrl: 'https://harlanzw.com/about',
  },
  b: {
    title: 'Blog',
    titleFull: 'Blog · Harlan Wilton',
    desc: 'Writing about open source, performance and the modern web.',
    canonical: 'https://harlanzw.com/blog',
    ogTitle: 'Blog',
    ogDesc: 'Writing about open source, performance and the modern web.',
    ogUrl: 'https://harlanzw.com/blog',
  },
}

/** Per-route head entry, the shape an app pushes/patches on navigation. */
export function routeHead(r: RouteState): Record<string, any> {
  return {
    title: r.title,
    meta: [
      { name: 'description', content: r.desc },
      { property: 'og:title', content: r.ogTitle },
      { property: 'og:description', content: r.ogDesc },
      { property: 'og:url', content: r.ogUrl },
    ],
    link: [{ rel: 'canonical', href: r.canonical }],
  }
}

export const ROUTE_HEAD_A = routeHead(ROUTES.a)
export const ROUTE_HEAD_B = routeHead(ROUTES.b)

// [input, options] pairs; same push order for every implementation
export const ENTRIES: [Record<string, any>, Record<string, any> | undefined][] = [
  // 1. nuxt.config app.head
  [{
    htmlAttrs: { lang: 'en', class: 'dark' },
    script: [{ 'src': 'https://analytics.example.com/script.js', 'data-site': 'VDJUVDNA', 'data-spa': 'auto', 'defer': true, 'key': 'analytics' }],
  }, undefined],
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
  }, undefined],
  // 3. app scripts at body close
  [{
    script: [
      { type: 'module', src: '/_nuxt/module.js', crossorigin: '' },
      { src: '/_nuxt/legacy.js', defer: true, crossorigin: '' },
    ],
  }, { tagPosition: 'bodyClose' }],
  // 4. payload
  [{
    script: [{ innerHTML: { data: { page: { title: 'About' } }, state: { user: null } } }],
  }, { tagPosition: 'bodyClose', tagPriority: 'high' }],
  // 5. site defaults (nuxt-seo style)
  [{
    titleTemplate: '%s · Harlan Wilton',
    bodyAttrs: { class: 'antialiased font-sans' },
    link: [{ rel: 'canonical', href: 'https://harlanzw.com/about' }],
    meta: [
      { name: 'description', content: 'Open source developer.' },
      { name: 'robots', content: 'index, follow' },
    ],
  }, { tagPriority: 101 }],
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
  }, undefined],
  // 7. page-level route head (route A on load; nav loop patches this entry)
  [ROUTE_HEAD_A, undefined],
]

export const SWITCHES = 50
