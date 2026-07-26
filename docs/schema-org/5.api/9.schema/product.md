---
title: Product Schema
description: Use defineProduct() to add Product structured data for e-commerce pages with pricing, reviews, and availability.
---

## Schema.org Product

- **Type**: `defineProduct<T extends Record<string, any>>(input?: Product & T)`{lang="ts"}

  Describes a Product on a WebPage.

## Useful Links

- [Product - Schema.org](https://schema.org/Product)
- [Product Schema Markup - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/product)
- [Recipe: E-commerce](/docs/schema-org/guides/recipes/e-commerce)

For a Google product snippet, `name` and at least one of `review`, `aggregateRating`, or `offers` are required. Google supports product rich results on pages focused on one product or variants of that product; see the [product snippet requirements](https://developers.google.com/search/docs/appearance/structured-data/product-snippet#structured-data-type-definitions).

## Unhead input properties

The `Product` TypeScript interface requires `name` and `image` when you pass an object. `defineProduct()` itself accepts no argument, and the resolver can inherit both values from page metadata. Unhead does not check Google's eligibility requirements at runtime.

- **name** `string`

  Provide the product name through the `title` route metadata or set `name` explicitly.

- **image**  `NodeRelations<ImageObject | string>`

  Link a primary image or a collection of images to the product.

## Recommended Properties

- **offers** `NodeRelations<Offer | number>`

  Add [Offer](https://schema.org/Offer) properties.

## Defaults

- **@type**: `Product`
- **@id**: `${canonicalUrl}#product`
- **name**: page title from resolved metadata
- **image**: resolved page image
- **description**: resolved page description
- **brand**: id reference of the identity
- **mainEntityOfPage**: ID reference of the WebPage

## Resolves

See [Global Resolves](/docs/schema-org/guides/get-started/overview#how-does-schemaorg-get-page-data) for full context.

- when `image` is a single string, it is resolved to a root ImageObject node with an absolute URL; arrays are left as the supplied image values

## Examples

### Minimal Example

```ts
defineProduct({
  name: 'Guide To Vue.js',
  image: '/vuejs-book.png',
})
```

### Product with an offer, rating, and review

```ts
defineProduct({
  name: 'Ergonomic Desk Chair',
  image: '/product.png',
  offers: [
    { price: 50 },
  ],
  aggregateRating: {
    ratingValue: 88,
    bestRating: 100,
    ratingCount: 20,
  },
  review: [
    {
      name: 'Comfortable and easy to assemble.',
      author: {
        name: 'Harlan Wilton',
      },
      reviewRating: {
        ratingValue: 5,
      },
    },
  ],
})
```

## Types

```ts
/**
 * Any offered product or service.
 * For example: a pair of shoes; a concert ticket; the rental of a car;
 * a haircut; or an episode of a TV show streamed online.
 */
export interface ProductSimple extends Thing {
  /**
   * The name of the product.
   */
  name: string
  /**
   * A reference-by-ID to one or more ImageObjects which represent the product.
   * Google eligibility has separate image guidelines; see the Product guide above.
   */
  image: NodeRelations<ImageObject | string>
  /**
   *  An array of references-by-ID to one or more Offer or aggregateOffer pieces.
   */
  offers?: NodeRelations<Offer | number>
  /**
   *  A reference to an Organization piece, representing the brand associated with the Product.
   */
  brand?: NodeRelation<Organization>
  /**
   * A reference to an Organization piece which represents the seller/merchant.
   */
  seller?: NodeRelation<Organization>
  /**
   * A text description of the product.
   */
  description?: string
  /**
   * An array of references-by-id to one or more Review pieces.
   */
  review?: NodeRelations<Review>
  /**
   * A merchant-specific identifier for the Product.
   */
  sku?: string
  /**
   * The Global Trade Item Number (GTIN) of the product.
   */
  gtin?: string
  /**
   * The Manufacturer Part Number (MPN) of the product.
   */
  mpn?: string
  /**
   * The condition of the product (e.g., New, Used, Refurbished).
   */
  itemCondition?: string
  /**
   * An AggregateRating object.
   */
  aggregateRating?: NodeRelation<AggregateRating>
  /**
   * An AggregateOffer object.
   */
  aggregateOffer?: NodeRelation<AggregateOffer>
  /**
   * A reference to an Organization piece, representing the brand which produces the Product.
   */
  manufacturer?: NodeRelation<Organization>
}
```

## Related Schemas

- [Organization](/docs/schema-org/api/schema/organization): Product brand/manufacturer
- [Breadcrumb](/docs/schema-org/api/schema/breadcrumb): Product navigation
- [ItemList](/docs/schema-org/api/schema/item-list): Product lists
