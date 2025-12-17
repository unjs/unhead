# @unhead/schema-org

> Unhead Schema.org for Simple and Automated Google Rich Results

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]

## Features

- 🔍 **Google Rich Results** - Automated schema generation for rich search results
- 🎯 **Type-safe** - Full TypeScript support with schema validation
- 🖖 **Framework agnostic** - Works with Vue, React, Svelte, SolidJS, and more
- 📋 **80+ Schema Types** - Support for most common schema.org types
- ⚡ **Zero runtime** - Generates optimized JSON-LD at build time
- 🔄 **Reactive** - Dynamic schema updates with framework reactivity

## Installation

```bash
# npm
npm install @unhead/schema-org

# yarn
yarn add @unhead/schema-org

# pnpm
pnpm add @unhead/schema-org
```

## Usage

### Vue

```vue
<script setup>
import { defineWebPage, defineWebSite, useSchemaOrg } from '@unhead/schema-org/vue'

useSchemaOrg([
  defineWebSite({
    name: 'My Website',
    url: 'https://example.com',
  }),
  defineWebPage({
    title: 'About Us',
    description: 'Learn more about our company',
  })
])
</script>
```

### React

```jsx
import { defineWebPage, defineWebSite, useSchemaOrg } from '@unhead/schema-org/react'

function About() {
  useSchemaOrg([
    defineWebSite({
      name: 'My Website',
      url: 'https://example.com',
    }),
    defineWebPage({
      title: 'About Us',
      description: 'Learn more about our company',
    })
  ])

  return <h1>About Us</h1>
}
```

### Framework Agnostic

```ts
import { defineWebPage, useSchemaOrg } from '@unhead/schema-org'

// Provide your unhead instance
useSchemaOrg([
  defineWebPage({
    title: 'My Page',
    description: 'Page description'
  })
], { head: myHeadInstance })
```

## Common Schema Types

### Article

```ts
import { defineArticle } from '@unhead/schema-org'

defineArticle({
  headline: 'How to use Schema.org',
  description: 'Learn how to implement schema.org',
  author: {
    name: 'John Doe',
    url: 'https://johndoe.com'
  },
  datePublished: '2023-01-01',
  dateModified: '2023-01-15'
})
```

### Organization

```ts
import { defineOrganization } from '@unhead/schema-org'

defineOrganization({
  name: 'My Company',
  url: 'https://mycompany.com',
  logo: 'https://mycompany.com/logo.png',
  sameAs: [
    'https://twitter.com/mycompany',
    'https://linkedin.com/company/mycompany'
  ]
})
```

### Product

```ts
import { defineProduct } from '@unhead/schema-org'

defineProduct({
  name: 'Amazing Product',
  description: 'The most amazing product ever',
  image: 'https://example.com/product.jpg',
  offers: {
    price: '29.99',
    priceCurrency: 'USD',
    availability: 'InStock'
  }
})
```

## Documentation

Visit the [Schema.org documentation](https://unhead.unjs.io/schema-org) for comprehensive guides and all available schema types.

## License

[MIT](./LICENSE)

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@unhead/schema-org/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/@unhead/schema-org

[npm-downloads-src]: https://img.shields.io/npm/dm/@unhead/schema-org.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/@unhead/schema-org

[license-src]: https://img.shields.io/github/license/unjs/unhead.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://github.com/unjs/unhead/blob/main/LICENSE
