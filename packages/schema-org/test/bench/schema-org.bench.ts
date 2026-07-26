import { bench, describe } from 'vitest'
import { createSchemaOrgGraph } from '../../src/core/graph'
import {
  defineArticle,
  defineOrganization,
  definePerson,
  defineProduct,
  defineWebPage,
  defineWebSite,
} from '../../src/runtime'

describe('schema-org core', () => {
  bench('createSchemaOrgGraph + resolveGraph (simple)', () => {
    const graph = createSchemaOrgGraph()
    graph.push(defineWebSite({
      name: 'Test Site',
    }))
    graph.push(defineWebPage({
      name: 'Test Page',
    }))
    graph.resolveGraph({
      host: 'https://example.com',
      path: '/',
      inLanguage: 'en',
    })
  }, { iterations: 5000 })

  bench('createSchemaOrgGraph + resolveGraph (complex)', () => {
    const graph = createSchemaOrgGraph()
    graph.push(defineWebSite({
      name: 'Test Site',
      description: 'A test site for benchmarking',
      inLanguage: 'en',
    }))
    graph.push(defineWebPage({
      name: 'Test Page',
      description: 'A test page',
    }))
    graph.push(definePerson({
      name: 'John Doe',
      url: 'https://example.com/john',
      sameAs: [
        'https://twitter.com/johndoe',
        'https://github.com/johndoe',
      ],
    }))
    graph.push(defineOrganization({
      name: 'Test Corp',
      logo: 'https://example.com/logo.png',
    }))
    graph.resolveGraph({
      host: 'https://example.com',
      path: '/about',
      inLanguage: 'en',
      title: 'About Page',
      description: 'Learn more about us',
    })
  }, { iterations: 5000 })

  bench('createSchemaOrgGraph + resolveGraph (product e-commerce)', () => {
    const graph = createSchemaOrgGraph()
    graph.push(defineProduct({
      name: 'Test Product',
      description: 'A great product',
      image: 'https://example.com/product.jpg',
      sku: 'SKU-12345',
      brand: {
        '@type': 'Brand',
        'name': 'Test Brand',
      },
      offers: {
        '@type': 'Offer',
        'price': 99.99,
        'priceCurrency': 'USD',
        'availability': 'https://schema.org/InStock',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        'ratingValue': 4.5,
        'reviewCount': 100,
      },
    }))
    graph.push(defineWebPage())
    graph.resolveGraph({
      host: 'https://example.com',
      path: '/products/test-product',
      inLanguage: 'en',
      currency: 'USD',
    })
  }, { iterations: 5000 })

  bench('createSchemaOrgGraph + resolveGraph (article blog)', () => {
    const graph = createSchemaOrgGraph()
    graph.push(defineArticle({
      headline: 'Test Article Title',
      description: 'This is a test article description',
      image: 'https://example.com/article.jpg',
      datePublished: '2024-01-01T00:00:00Z',
      dateModified: '2024-01-02T00:00:00Z',
      author: {
        '@type': 'Person',
        'name': 'Jane Author',
        'url': 'https://example.com/jane',
      },
    }))
    graph.push(defineWebSite({
      name: 'Blog Site',
    }))
    graph.push(defineWebPage())
    graph.resolveGraph({
      host: 'https://example.com',
      path: '/blog/test-article',
      inLanguage: 'en',
      title: 'Test Article Title',
      description: 'This is a test article description',
    })
  }, { iterations: 5000 })

  bench('graph.find() lookups (10 nodes)', () => {
    const graph = createSchemaOrgGraph()
    for (let i = 0; i < 10; i++) {
      graph.push(definePerson({
        '@id': `#person-${i}`,
        'name': `Person ${i}`,
      }))
    }
    graph.resolveGraph({
      host: 'https://example.com',
      path: '/',
    })
    // Now do lookups
    for (let i = 0; i < 10; i++) {
      graph.find(`#person-${i}`)
    }
  }, { iterations: 5000 })

  bench('dedupe nodes (5 duplicates)', () => {
    const graph = createSchemaOrgGraph()
    // Add duplicates
    for (let i = 0; i < 5; i++) {
      graph.push(definePerson({
        '@id': '#identity',
        'name': 'Same Person',
        'sameAs': [`https://social${i}.com/person`],
      }))
    }
    graph.resolveGraph({
      host: 'https://example.com',
      path: '/',
    })
  }, { iterations: 5000 })
})
