export default defineNuxtConfig({
  extends: ['@nuxt-themes/docus'],

  // github: {
  //   owner: 'vueuse',
  //   repo: 'schema-org',
  //   branch: 'main',
  //   token: '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',
  // },
  //
  // modules: ['@nuxtlabs/github-module'],

  app: {
    head: {
      title: 'unhead',
      meta: [
        { property: 'og:title', content: 'unhead' },
        { property: 'og:description', content: 'Tiny, full-featured universal document <head> manager, for everyone.' },
        { property: 'og:url', content: 'https://vue-schema-org.netlify.app/' },
        { property: 'og:image', content: 'https://vue-schema-org.netlify.app/og.png' },
        { name: 'twitter:title', content: 'unhead' },
        { name: 'twitter:description', content: 'Tiny, full-featured universal document <head> manager, for everyone.' },
        { name: 'twitter:image', content: 'https://vue-schema-org.netlify.app/og.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      link: [
        { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml', media: '(prefers-color-scheme:no-preference)' },
        { rel: 'icon', href: '/logo-dark.svg', type: 'image/svg+xml', media: '(prefers-color-scheme:dark)' },
        { rel: 'icon', href: '/logo-light.svg', type: 'image/svg+xml', media: '(prefers-color-scheme:light)' },
      ],
      script: [
        // {
        //   'src': 'https://cdn.usefathom.com/script.js',
        //   'data-spa': 'auto',
        //   'data-site': 'UQADBWCI',
        //   'defer': true,
        // },
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
