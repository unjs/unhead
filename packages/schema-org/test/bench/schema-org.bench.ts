import { bench, describe } from 'vitest'
import { createSchemaOrgGraph } from '../../src/core/graph'
import { loadResolver } from '../../src/resolver'

describe('schema-org core', () => {
  bench('createSchemaOrgGraph + resolveGraph (simple)', () => {
    const graph = createSchemaOrgGraph()
    graph.push({
      '@type': 'WebSite',
      'name': 'Test Site',
      '_resolver': loadResolver('webSite'),
    })
    graph.push({
      '@type': 'WebPage',
      'name': 'Test Page',
      '_resolver': loadResolver('webPage'),
    })
    graph.resolveGraph({
      host: 'https://example.com',
      path: '/',
      inLanguage: 'en',
    })
  }, { iterations: 5000 })

  bench('createSchemaOrgGraph + resolveGraph (complex)', () => {
    const graph = createSchemaOrgGraph()
    graph.push({
      '@type': 'WebSite',
      'name': 'Test Site',
      'description': 'A test site for benchmarking',
      'inLanguage': 'en',
      '_resolver': loadResolver('webSite'),
    })
    graph.push({
      '@type': 'WebPage',
      'name': 'Test Page',
      'description': 'A test page',
      '_resolver': loadResolver('webPage'),
    })
    graph.push({
      '@type': 'Person',
      'name': 'John Doe',
      'url': 'https://example.com/john',
      'sameAs': [
        'https://twitter.com/johndoe',
        'https://github.com/johndoe',
      ],
      '_resolver': loadResolver('person'),
    })
    graph.push({
      '@type': 'Organization',
      'name': 'Test Corp',
      'logo': 'https://example.com/logo.png',
      '_resolver': loadResolver('organization'),
    })
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
    graph.push({
      '@type': 'Product',
      'name': 'Test Product',
      'description': 'A great product',
      'image': 'https://example.com/product.jpg',
      'sku': 'SKU-12345',
      'brand': {
        '@type': 'Brand',
        'name': 'Test Brand',
      },
      'offers': {
        '@type': 'Offer',
        'price': 99.99,
        'priceCurrency': 'USD',
        'availability': 'https://schema.org/InStock',
      },
      'aggregateRating': {
        '@type': 'AggregateRating',
        'ratingValue': 4.5,
        'reviewCount': 100,
      },
      '_resolver': loadResolver('product'),
    })
    graph.push({
      '@type': 'WebPage',
      '_resolver': loadResolver('webPage'),
    })
    graph.resolveGraph({
      host: 'https://example.com',
      path: '/products/test-product',
      inLanguage: 'en',
      currency: 'USD',
    })
  }, { iterations: 5000 })

  bench('createSchemaOrgGraph + resolveGraph (article blog)', () => {
    const graph = createSchemaOrgGraph()
    graph.push({
      '@type': 'Article',
      'headline': 'Test Article Title',
      'description': 'This is a test article description',
      'image': 'https://example.com/article.jpg',
      'datePublished': '2024-01-01T00:00:00Z',
      'dateModified': '2024-01-02T00:00:00Z',
      'author': {
        '@type': 'Person',
        'name': 'Jane Author',
        'url': 'https://example.com/jane',
      },
      '_resolver': loadResolver('article'),
    })
    graph.push({
      '@type': 'WebSite',
      'name': 'Blog Site',
      '_resolver': loadResolver('webSite'),
    })
    graph.push({
      '@type': 'WebPage',
      '_resolver': loadResolver('webPage'),
    })
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
      graph.push({
        '@type': 'Person',
        '@id': `#person-${i}`,
        'name': `Person ${i}`,
        '_resolver': loadResolver('person'),
      })
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
      graph.push({
        '@type': 'Person',
        '@id': '#identity',
        'name': 'Same Person',
        'sameAs': [`https://social${i}.com/person`],
        '_resolver': loadResolver('person'),
      })
    }
    graph.resolveGraph({
      host: 'https://example.com',
      path: '/',
    })
  }, { iterations: 5000 })
})
