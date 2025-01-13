import { defineCollection, defineContentConfig } from '@nuxt/content'
import { resolve } from 'pathe'

export default defineContentConfig({
  collections: {
    docsUnhead: defineCollection({
      type: 'page',
      source: {
        include: '**/*.md',
        cwd: resolve('content/docs/unhead'),
        prefix: '/docs/unhead',
      },
    }),
    docsSchemaOrg: defineCollection({
      type: 'page',
      source: {
        include: '**/*.md',
        cwd: resolve('content/docs/schema-org'),
        prefix: '/docs/schema-org',
      },
    }),
    docsScripts: defineCollection({
      type: 'page',
      source: {
        include: '**/*.md',
        cwd: resolve('content/docs/scripts'),
        prefix: '/docs/scripts',
      },
    }),
  },
})
