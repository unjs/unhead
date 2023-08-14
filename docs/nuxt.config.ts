export default defineNuxtConfig({
  extends: [
    '@nuxt-themes/docus',
    'nuxt-lego',
  ],

  site: {
    titleSeparator: '·',
    name: 'Unhead',
    url: 'https://unhead.harlanzw.com',
    description: 'Universal document <head> tag manager. Framework agnostic. Platform agnostic.',
    defaultLocale: 'en',
  },

  app: {
    head: {
      titleTemplate: '%s %separator Unhead',
    }
  },

  modules: [
    'nuxt-seo-kit-module',
    'nuxt-windicss',
    '@nuxtjs/fontaine',
  ],

  pinceau: {
    debug: true,
    followSymbolicLinks: false,
  },

  app: {
    head: {
      link: [
        // @todo nuxt-seo-experiments to handle light / dark
        { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml', media: '(prefers-color-scheme:no-preference)' },
        { rel: 'icon', href: '/logo-dark.svg', type: 'image/svg+xml', media: '(prefers-color-scheme:dark)' },
        { rel: 'icon', href: '/logo-light.svg', type: 'image/svg+xml', media: '(prefers-color-scheme:light)' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com', crossorigin: 'anonymous' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
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
  //
  fontMetrics: {
    fonts: ['Inter'],
  },
})
