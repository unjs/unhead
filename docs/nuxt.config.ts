import { defineNuxtConfig } from 'nuxt/config'
import { resolve } from 'pathe'

export default defineNuxtConfig({
  // const pkgJson = await readPackageJSON('../package.json')
  modules: [
    'nuxt-content-twoslash',
    '@vueuse/motion/nuxt',
    '@nuxt/ui-pro',
    '@nuxtjs/seo',
    'radix-vue/nuxt',
    '@vueuse/nuxt',
    '@nuxthub/core',
    '@nuxt/fonts',
    '@nuxt/content',
    '@nuxt/scripts',
    '@nuxt/image',
    // maybe buggy
    'nuxt-rebundle',
    'nuxt-build-cache',
    async (_, nuxt) => {
      nuxt.hooks.hook('nitro:init', (nitro) => {
        // from sponsorkit
        nitro.options.alias.sharp = 'unenv/runtime/mock/empty'
        nitro.options.alias.pnpapi = 'unenv/runtime/mock/empty' // ?
        nitro.options.alias['#content/server'] = resolve('./server/content-v2')
      })
    },
  ],

  ui: {
    theme: {
      transitions: true,
    },
  },

  robots: {
    disableNuxtContentIntegration: true,
  },

  sitemap: {
    strictNuxtContentPaths: true,
    xslColumns: [
      { label: 'URL', width: '100%' },
    ],
  },

  hub: {
    database: true,
    cache: true,
    kv: true,
  },

  future: {
    compatibilityVersion: 4,
  },

  runtimeConfig: {
    emailOctopusToken: '', // NUXT_EMAIL_OCTOPUS_TOKEN
    githubAccessToken: '', // NUXT_GITHUB_ACCESS_TOKEN
    githubAuthToken: '', // NUXT_GITHUB_AUTH_TOKEN
    githubAuthClientId: 'cabace556bd9519d9299', // NUXT_GITHUB_AUTH_CLIENT_ID
    githubAuthClientSecret: '', // NUXT_GITHUB_AUTH_SECRET_ID

    public: {
      // moduleDeps: pkgJson.dependencies,
      // version: pkgJson.version,
    },
  },

  twoslash: {
    floatingVueOptions: {
      classMarkdown: 'prose prose-primary dark:prose-invert bg-blue-500',
    },
    // Skip Twoslash in dev to improve performance. Turn this on when you want to explictly test twoslash in dev.
    enableInDev: false,
    // Do not throw when twoslash fails, the typecheck should be down in github.com/nuxt/nuxt's CI
    throws: false,
  },

  fonts: {
    experimental: {
      processCSSVariables: true,
    },
    families: [
      { name: 'Hubot Sans', provider: 'local', weight: [200, 900], stretch: '75% 125%' },
    ],
  },

  nitro: {
    prerender: {
      failOnError: false,
      crawlLinks: true,
      routes: ['/'],
    },
  },

  site: {
    url: 'https://unhead.unjs.io/',
    name: 'Unhead',
    description: 'Unhead is the any-framework document head manager built for performance and delightful developer experience.',
    tagline: 'All the boring SEO stuff for Nuxt done.',
  },

  imports: {
    autoImport: true,
  },

  typescript: {
    strict: false,
    includeWorkspace: true,
  },

  alias: {
    '#content/server': resolve('./server/content-v2'),
    'unhead/plugins': resolve('../packages/unhead/src/plugins'),
    'unhead/client': resolve('../packages/unhead/src/client'),
    'unhead/server': resolve('../packages/unhead/src/server'),
    'unhead/legacy': resolve('../packages/unhead/src/legacy'),
    'unhead': resolve('../packages/unhead/src/legacy'),
    '@unhead/vue': resolve('../packages/vue/src/legacy'),
  },

  content: {
    database: { type: 'd1', binding: 'DB' },
    build: {
      markdown: {
        highlight: {
          theme: {
            light: 'github-light',
            default: 'github-light',
            dark: 'material-theme-palenight',
          },
          langs: [
            'ts',
            'vue',
            'json',
            'html',
            'bash',
            'xml',
            'diff',
            'md',
            'dotenv',
          ],
        },
      },
    },
  },

  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],

  hooks: {
    'components:extend': function (components) {
      for (const component of components) {
        if (component.pascalName === 'UAlert') {
          component.global = true
        }
      }
    },
  },

  mdc: {
    highlight: {
      theme: {
        light: 'github-light',
        default: 'github-light',
        dark: 'material-theme-palenight',
      },
      langs: [
        'ts',
        'vue',
        'json',
        'html',
        'bash',
        'xml',
        'diff',
        'md',
        'dotenv',
      ],
    },
  },

  schemaOrg: {
    identity: {
      type: 'Organization',
      name: 'Unhead',
      logo: '/logo.svg',
    },
  },

  $production: {
    routeRules: {
      '/api/_mdc/highlight': { cache: { group: 'mdc', name: 'highlight', maxAge: 60 * 60 } },
      '/api/_content/query/**': { cache: { group: 'content', name: 'query', maxAge: 60 * 60 } },
      '/api/_nuxt_icon': { cache: { group: 'icon', name: 'icon', maxAge: 60 * 60 * 24 * 7 } },
    },
    scripts: {
      registry: {
        fathomAnalytics: {
          site: 'BRDEJWKJ',
        },
      },
    },
  },

  routeRules: {
  },

  css: [
    '~/css/global.css',
  ],

  ogImage: {
    zeroRuntime: true,
    strictNuxtContentPaths: true,
    fonts: [
      'Hubot+Sans:400',
      'Hubot+Sans:700',
    ],
  },

  icon: {
    customCollections: [{
      prefix: 'custom',
      dir: resolve('./app/assets/icons'),
    }],
    clientBundle: {
      scan: true,
      includeCustomCollections: true,
    },
    provider: 'iconify',
  },

  seo: {
    meta: {
      themeColor: [
        { content: '#18181b', media: '(prefers-color-scheme: dark)' },
        { content: 'white', media: '(prefers-color-scheme: light)' },
      ],
    },
  },

  app: {
    pageTransition: {
      name: 'page',
      mode: 'out-in',
    },
    head: {
      templateParams: {
        separator: '·',
      },

      bodyAttrs: {
        class: 'antialiased font-sans text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900',
      },

    },
  },

  compatibilityDate: '2024-07-12',
})
