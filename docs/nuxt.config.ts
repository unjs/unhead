import colors from 'tailwindcss/colors'
import { excludeColors } from './colors'
import { version } from './package.json'

delete colors.lightBlue
delete colors.warmGray
delete colors.trueGray
delete colors.coolGray
delete colors.blueGray

export default defineNuxtConfig({
  extends: [
    'nuxt-lego',
  ],
  modules: [
    '@nuxthq/ui',
    '@vueuse/nuxt',
    '@nuxt/content',
    'nuxt-lodash',
    'nuxt-icon',
    '@nuxtseo/module',
  ],
  site: {
    url: 'unhead.unjs.io',
  },
  runtimeConfig: {
    public: {
      version,
    },
  },
  content: {
    highlight: {
      theme: {
        light: 'github-light',
        default: 'material-theme-lighter',
        dark: 'material-theme-palenight',
      },
      preload: ['json', 'js', 'ts', 'html', 'css', 'vue', 'diff', 'shell', 'markdown', 'yaml', 'bash', 'ini'],
    },
  },
  ui: {
    global: true,
    icons: ['heroicons', 'simple-icons'],
    safelistColors: excludeColors(colors),
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
    seoMeta: {
      themeColor: [
        { content: '#18181b', media: '(prefers-color-scheme: dark)' },
        { content: 'white', media: '(prefers-color-scheme: light)' },
      ],
    },
    head: {
      titleTemplate: '%s %separator %site.name',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com', crossorigin: 'anonymous' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600&display=swap' },
        { rel: 'stylesheet', href: 'https://rsms.me/inter/inter.css' },
      ],

      bodyAttrs: {
        class: 'antialiased font-sans text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900',
      },

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
  devtools: {
    enabled: true,
  },
  typescript: {
    strict: false,
    includeWorkspace: true,
  },
  experimental: {
    // asyncContext: true,
    headNext: true,
  },
  generate: {
    routes: ['/'],
  },
})
