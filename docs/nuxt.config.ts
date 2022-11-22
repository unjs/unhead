export default defineNuxtConfig({
  extends: ['@nuxt-themes/docus'],

  app: {
    head: {
      title: 'unhead',
      meta: [
        { property: 'og:title', content: 'unhead' },
        { property: 'og:description', content: 'Tiny, full-featured universal document <head> manager, for everyone.' },
        { property: 'og:url', content: 'https://unhead.harlanzw.com/' },
        { property: 'og:image', content: 'https://opengraph.githubassets.com/a182ba19b1d86cf8f4f048b85443c3242c11f24b3e86a7367b61b6c8dc877ff0/unjs/unhead' },
        { name: 'twitter:title', content: 'unhead' },
        { name: 'twitter:description', content: 'Tiny, full-featured universal document <head> manager, for everyone.' },
        { name: 'twitter:image', content: 'https://opengraph.githubassets.com/a182ba19b1d86cf8f4f048b85443c3242c11f24b3e86a7367b61b6c8dc877ff0/unjs' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      link: [
        { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml', media: '(prefers-color-scheme:no-preference)' },
        { rel: 'icon', href: '/logo-dark.svg', type: 'image/svg+xml', media: '(prefers-color-scheme:dark)' },
        { rel: 'icon', href: '/logo-light.svg', type: 'image/svg+xml', media: '(prefers-color-scheme:light)' },
      ],
      script: [
        {
          'src': 'https://cdn.usefathom.com/script.js',
          'data-spa': 'auto',
          'data-site': 'BRDEJWKJ',
          'defer': true,
        },
      ],
    },
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: [
        '/',
      ],
    },
  },
})
