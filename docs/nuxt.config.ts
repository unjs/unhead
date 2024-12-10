import { dirname } from 'pathe'
import { readPackageJSON } from 'pkg-types'

const pkgJson = readPackageJSON(`${dirname(__dirname)}/package.json`)

export default defineNuxtConfig({
  extends: [
    'nuxt-lego',
    '@nuxt/ui-pro',
  ],

  modules: [
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxt/content',
    '@nuxt/fonts',
    'nuxt-og-image',
    'nuxt-icon',
    '@nuxtjs/seo',
    '@nuxt/image',
    '@nuxt/scripts',
  ],

  build: {
    transpile: ['shiki'],
  },

  site: {
    name: 'Unhead',
    url: 'unhead.unjs.io',
    description: 'Unhead is the any-framework document head manager built for performance and delightful developer experience.',
    tagline: 'Get your &lt;head&gt; in the game.',
  },

  runtimeConfig: {
    public: {
      version: pkgJson.version,
    },
  },

  scripts: {
    registry: {
      fathomAnalytics: {
        site: 'BRDEJWKJ',
      },
    },
  },

  nitro: {
    prerender: {
      failOnError: false,
      crawlLinks: true,
      routes: ['/'],
    },
  },

  content: {
    highlight: {
      theme: {
        light: 'github-light',
        default: 'material-theme-lighter',
        dark: 'material-theme-palenight',
      },
    },
  },

  ui: {
    global: true,
  },

  sitemap: {
    strictNuxtContentPaths: true,
    xslColumns: [
      { label: 'URL', width: '50%' },
      { label: 'Last Modified', select: 'sitemap:lastmod', width: '25%' },
      { label: 'Priority', select: 'sitemap:priority', width: '12.5%' },
      { label: 'Change Frequency', select: 'sitemap:changefreq', width: '12.5%' },
    ],
  },

  app: {
    head: {
      link: [
        { rel: 'stylesheet', href: 'https://rsms.me/inter/inter.css' },
      ],

      bodyAttrs: {
        class: 'antialiased font-sans text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900',
      },
      seoMeta: {
        googleSiteVerification: 'SnwVo-uFg39U69WHDoKma6bdT7hoh7sNYrviT8QuJww',
        themeColor: [
          { content: '#18181b', media: '(prefers-color-scheme: dark)' },
          { content: 'white', media: '(prefers-color-scheme: light)' },
        ],
      },
    },
  },

  devtools: {
    enabled: true,
  },

  tailwindcss: {
    viewer: false,
  },

  seo: {
    // redirectToCanonicalSiteUrl: true,
  },

  ogImage: {
    debug: process.dev,
  },

  experimental: {
    // asyncContext: true,
    headNext: true,
    externalVue: false,
  },

  compatibilityDate: '2024-07-22',
})
