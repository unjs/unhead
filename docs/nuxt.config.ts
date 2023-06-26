export default defineNuxtConfig({
  extends: [
    '@nuxt-themes/docus',
    'nuxt-seo-kit',
  ],

  runtimeConfig: {
    indexable: true,
    public: {
      titleSeparator: '·',
      siteUrl: 'https://unhead.harlanzw.com/',
      siteName: 'Unhead',
      trailingSlash: false,
      siteDescription: 'Universal document <head> tag manager. Framework agnostic. Platform agnostic.',
      language: 'en',
    }
  },

  // vite: {
  //   server: {
  //     fs: {
  //       allow: ['..'],
  //     }
  //   }
  // },

  modules: [
    'nuxt-windicss',
    '@nuxtjs/fontaine'
  ],

  hooks: {
    'nitro:config'(nitro) {
      nitro.virtual["#build/dist/server/styles.mjs"] = "export default {}";
      // prev [/[/\\]node_modules[/\\]/, /[/\\]\.git[/\\]/],
      // nitro.options.imports.exclude = [/[/\\]\.git[/\\]/]
    }
  },

  studio: {
    // enabled: false,
  },

  pinceau: {
    debug: true,
    followSymbolicLinks: false,
  },

  app: {
    head: {
      link: [
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
