---
title: eCommerce
---

::alert{type="warning"}
🔨 Documentation in progress
::

## Useful Links

- [defineProduct](/schema-org/schema/product)
- [Product | Google Search Central](https://developers.google.com/search/docs/advanced/structured-data/product)
- [Product | Yoast](https://developer.yoast.com/features/schema/pieces/product)

## Marking up a Product

The [defineProduct](/schema-org/schema/product) function and [SchemaOrgProduct](/schema-org/getting-started/vue-components) component are provided
to create Product Schema whilst handling relations for you.

Note that some fields may already be inferred, see [Schema.org Params](/guide/getting-started/params)

::code-group

```ts [useSchemaOrg]
useSchemaOrg([
  defineProduct({
    name: 'Schema.org Book',
    description: 'Discover how to use Schema.org',
    image: [
      'https://example.com/photos/16x9/photo.jpg'
    ],
    offers: [
      { price: 50 },
    ],
  })
])
```

::
