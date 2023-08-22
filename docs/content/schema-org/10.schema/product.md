## Schema.org Product

- **Type**: `defineProduct(input?: Product)`{lang="ts"}

  Describes an `Product` on a `WebPage`.

- **Component**: `SchemaOrgProduct` _(see [how components work](/guide/guides/components))_

## Useful Links

- [Product - Schema.org](https://schema.org/Product)
- [Product Schema Markup - Google Search Central](https://developers.google.com/search/docs/advanced/structured-data/product)
- [Product - Yoast](https://developer.yoast.com/features/schema/pieces/product)
- [Recipe: eCommerce](/guide/recipes/e-commerce)


## Required properties

- **name** `string`

  The name of the product. Provided via route meta key `title` or `name` manually.


- **image**  `Arrayable<ImageInput>`

  Link a primary image or a collection of images to used to the product

## Recommended Properties

- **offers** `OfferInput[]`

  Add [Offer](https://schema.org/Offer) properties.


## Defaults

- **@type**: `Product`
- **@id**: `${canonicalUrl}#product`
- **name**: `currentRouteMeta.title` _(see: [route meta resolving](/guide/getting-started/how-it-works#route-meta-resolving))_
- **image**: `currentRouteMeta.image` _(see: [route meta resolving](/guide/getting-started/how-it-works#route-meta-resolving))_
- **description**: `currentRouteMeta.description` _(see: [route meta resolving](/guide/getting-started/how-it-works#route-meta-resolving))_
- **brand**: id reference of the identity 
- **mainEntityOfPage** id reference of the web page


## Resolves

See [Global Resolves](/guide/getting-started/how-it-works#global-resolves) for full context.

- `image`'s are resolved to absolute

## Examples

### Minimal Example

```ts
defineProduct({
  name: 'Guide To Vue.js',
  image: '/vuejs-book.png',
})
```

### Other Example

```ts
defineProduct({
  name: 'test',
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
      name: 'Awesome product!',
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
   * A reference-by-ID to one or more imageObject's which represent the product.
   * - Must be at least 696 pixels wide.
   * - Must be of the following formats+file extensions: .jpg, .png, .gif ,or .webp.
   */
  image: NodeRelations<ImageObject | string>
  /**
   *  An array of references-by-ID to one or more Offer or aggregateOffer pieces.
   */
  offers?: NodeRelations<Offer | number>
  /**
   *  A reference to an Organization piece, representing brand associated with the Product.
   */
  brand?: NodeRelation<Organization>
  /**
   * A reference to an Organization piece which represents the WebSite.
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
