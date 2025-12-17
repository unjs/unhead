import { createHead, renderSSRHead } from 'unhead/server'
import { bench, describe } from 'vitest'
import {
  definePerson,
  defineWebPage,
  defineWebSite,
  normalizeSchemaOrgInput,
} from '../../src'
import { UnheadSchemaOrg } from '../../src/plugin'

describe('schema-org SSR e2e', () => {
  bench('full e2e with schema.org', async () => {
    const head = createHead()
    head.use(UnheadSchemaOrg())

    // Setup template params
    head.push({
      templateParams: {
        schemaOrg: {
          url: 'https://example.com/about',
          host: 'https://example.com',
          inLanguage: 'en',
          path: '/about',
        },
      },
    })

    // Schema.org entry
    head.push({
      script: [{
        type: 'application/ld+json',
        key: 'schema-org-graph',
        // @ts-expect-error untyped
        nodes: [],
      }],
    })

    // Add nodes
    head.push(normalizeSchemaOrgInput([
      defineWebSite({
        name: 'Test Site',
        inLanguage: 'en',
        description: 'A test site for benchmarking',
      }),
      defineWebPage(),
      definePerson({
        name: 'Test Person',
        url: 'https://example.com/',
        sameAs: [
          'https://twitter.com/test',
          'https://github.com/test',
        ],
      }),
    ]) as any)

    await renderSSRHead(head)
  }, { iterations: 5000 })

  bench('complex e2e with schema.org (multiple entities)', async () => {
    const head = createHead()
    head.use(UnheadSchemaOrg())

    head.push({
      templateParams: {
        schemaOrg: {
          url: 'https://example.com/products/widget',
          host: 'https://example.com',
          inLanguage: 'en',
          path: '/products/widget',
          currency: 'USD',
        },
      },
    })

    head.push({
      script: [{
        type: 'application/ld+json',
        key: 'schema-org-graph',
        // @ts-expect-error untyped
        nodes: [],
      }],
    })

    head.push(normalizeSchemaOrgInput([
      defineWebSite({
        name: 'E-Commerce Store',
        inLanguage: 'en',
        description: 'The best online store',
      }),
      defineWebPage({
        '@type': 'ItemPage',
      }),
      {
        '@type': 'Product',
        'name': 'Widget Pro',
        'description': 'The best widget ever made',
        'image': 'https://example.com/widget.jpg',
        'sku': 'WIDGET-001',
        'brand': { '@type': 'Brand', 'name': 'WidgetCorp' },
        'offers': {
          '@type': 'Offer',
          'price': 99.99,
          'priceCurrency': 'USD',
          'availability': 'https://schema.org/InStock',
        },
        'aggregateRating': {
          '@type': 'AggregateRating',
          'ratingValue': 4.8,
          'reviewCount': 256,
        },
        '_resolver': 'product',
      },
      {
        '@type': 'Organization',
        'name': 'WidgetCorp',
        'url': 'https://example.com',
        'logo': 'https://example.com/logo.png',
        '_resolver': 'organization',
      },
    ]) as any)

    await renderSSRHead(head)
  }, { iterations: 5000 })

  bench('baseline without schema.org', async () => {
    const head = createHead()

    head.push({
      title: 'Test Page',
      meta: [
        { name: 'description', content: 'Test description' },
      ],
      link: [
        { rel: 'canonical', href: 'https://example.com/' },
      ],
    })

    await renderSSRHead(head)
  }, { iterations: 5000 })
})
