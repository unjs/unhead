---
title: Schema.org for E-commerce Sites
description: 'Add Product structured data with defineProduct() so product pages can become eligible for search features showing prices, ratings, availability, and reviews.'
navigation:
  title: E-commerce
---

Use `defineProduct()` with `offers`, `aggregateRating`, and `review` properties to make a product page eligible for product search features. Google may display price, availability, ratings, and review counts in search results.

## Useful Links

- [defineProduct](/docs/schema-org/api/schema/product)
- [Product - Schema.org](https://schema.org/Product)
- [Product | Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/product)

Google separates product snippets from merchant listings. Product rich results are intended for pages focused on one product or variants of that product, not category pages; see the [product snippet eligibility guidelines](https://developers.google.com/search/docs/appearance/structured-data/product-snippet#technical-guidelines).

## Product pages

[defineProduct](/docs/schema-org/api/schema/product) creates a Product node and handles its supported relationships.

Some fields may already be inferred. See [Schema.org Params](/docs/schema-org/guides/core-concepts/params).

```ts
import { defineProduct, useSchemaOrg } from '@unhead/schema-org/@framework'

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

## A detailed product

Include the properties that apply to the product and appear on the page:

```ts
import { defineOrganization, defineProduct, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineProduct({
    name: 'Premium Ergonomic Office Chair',
    description: 'Office chair with lumbar support and adjustable height.',
    image: [
      'https://example.com/images/chair-front.jpg',
      'https://example.com/images/chair-side.jpg',
      'https://example.com/images/chair-back.jpg'
    ],
    sku: 'CHAIR-123',
    mpn: 'ERGO-2023-BLK',
    gtin13: '9780123456789',
    brand: defineOrganization({
      name: 'ErgoComfort'
    }),
    offers: {
      price: 299.99,
      priceCurrency: 'USD',
      url: 'https://example.com/chair-ergonomic',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition'
    },
    aggregateRating: {
      ratingValue: 4.7,
      reviewCount: 89
    },
    review: [
      {
        author: 'Jane Doe',
        datePublished: '2023-01-15',
        reviewBody: 'This chair has dramatically improved my posture and comfort throughout the workday.',
        reviewRating: {
          ratingValue: 5
        }
      },
      {
        author: 'John Smith',
        datePublished: '2023-02-20',
        reviewBody: 'Excellent build quality, but took some time to adjust properly.',
        reviewRating: {
          ratingValue: 4
        }
      }
    ]
  })
])
```

If you provide `priceValidUntil`, keep it current. Google warns that a [product snippet may not display after that date](https://developers.google.com/search/docs/appearance/structured-data/product-snippet#offer-properties).

## Multiple offers and product variants

The following approach associates several offers with one Product. It does not create Google's ProductGroup variant markup; use custom nodes if you need `ProductGroup` and `hasVariant`.

```ts
import { defineProduct, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineProduct({
    name: 'Cotton T-Shirt',
    description: '100% cotton T-shirt available in several colors and sizes.',
    image: [
      'https://example.com/images/tshirt-main.jpg',
      'https://example.com/images/tshirt-red.jpg',
      'https://example.com/images/tshirt-blue.jpg'
    ],
    offers: [
      {
        name: 'Small Red T-Shirt',
        price: 19.99,
        priceCurrency: 'USD',
        sku: 'TSHIRT-S-RED',
        availability: 'https://schema.org/InStock',
        url: 'https://example.com/tshirt-small-red'
      },
      {
        name: 'Medium Red T-Shirt',
        price: 19.99,
        priceCurrency: 'USD',
        sku: 'TSHIRT-M-RED',
        availability: 'https://schema.org/InStock',
        url: 'https://example.com/tshirt-medium-red'
      },
      {
        name: 'Small Blue T-Shirt',
        price: 19.99,
        priceCurrency: 'USD',
        sku: 'TSHIRT-S-BLUE',
        availability: 'https://schema.org/OutOfStock',
        url: 'https://example.com/tshirt-small-blue'
      }
    ]
  })
])
```

## Availability values

For the `availability` property, common Schema.org values include:

- `https://schema.org/InStock`: Item is in stock
- `https://schema.org/OutOfStock`: Item is out of stock
- `https://schema.org/PreOrder`: Item is available for pre-order
- `https://schema.org/Discontinued`: Item has been discontinued
- `https://schema.org/BackOrder`: Item is on backorder and will be available later
- `https://schema.org/InStoreOnly`: Item is available only in physical stores
- `https://schema.org/LimitedAvailability`: Item has limited availability
- `https://schema.org/OnlineOnly`: Item is available only online
- `https://schema.org/PreSale`: Item is available in a presale
- `https://schema.org/SoldOut`: Item is sold out

## Collection pages

For category or collection pages that list multiple products, use the CollectionPage type:

```ts
import { defineWebPage, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineWebPage({
    '@type': 'CollectionPage',
    'name': 'Office Furniture Collection',
    'description': 'Browse desks, chairs, and other office furniture.'
  })
])
```

## Cart and checkout pages

Use a plain WebPage for a shopping cart and `CheckoutPage` for the checkout flow:

```ts
import { defineWebPage, useSchemaOrg } from '@unhead/schema-org/@framework'

// For a shopping cart page
useSchemaOrg([
  defineWebPage({
    'name': 'Your Shopping Cart',
    'description': 'Review and edit your shopping cart items before checkout.'
  })
])

// For a checkout page
useSchemaOrg([
  defineWebPage({
    '@type': 'CheckoutPage',
    'name': 'Checkout',
    'description': 'Complete your purchase securely.'
  })
])
```

## Store identity

For ecommerce sites, establish the brand identity with [Organization](/docs/schema-org/api/schema/organization) or [LocalBusiness](/docs/schema-org/api/schema/local-business), depending on whether the store has a physical location.

See the [Identity](/docs/schema-org/guides/recipes/identity) guide for more details.

```ts
// Organization Example
import { defineOrganization, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineOrganization({
    name: 'My E-commerce Store',
    logo: 'https://example.com/logo.png',
    sameAs: [
      'https://facebook.com/mystore',
      'https://instagram.com/mystore',
      'https://twitter.com/mystore'
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        'telephone': '+1-555-123-4567',
        'contactType': 'customer service',
        'areaServed': 'US',
        'availableLanguage': ['English', 'Spanish']
      }
    ]
  })
])
```

```ts
// LocalBusiness Example
import { defineLocalBusiness, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineLocalBusiness({
    'name': 'My Retail Store',
    'image': 'https://example.com/store-front.jpg',
    '@type': 'ClothingStore',
    'address': {
      streetAddress: '123 Main St',
      addressLocality: 'Anytown',
      addressRegion: 'CA',
      postalCode: '12345',
      addressCountry: 'US'
    },
    'telephone': '+1-555-123-4567',
    'priceRange': '$$',
    'openingHoursSpecification': [
      {
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday'
        ],
        opens: '09:00',
        closes: '17:00'
      },
      {
        dayOfWeek: ['Saturday'],
        opens: '10:00',
        closes: '16:00'
      }
    ]
  })
])
```

## Keep product data accurate

- Keep prices and availability in sync with the visible product page.
- Include only genuine review and aggregate-rating data.
- Give each product or offer the URL that identifies it on your site.
- Test the rendered output with [Google's Rich Results Test](https://search.google.com/test/rich-results).

::tip
Combine Product markup with relevant structured data such as breadcrumbs and an Organization or LocalBusiness identity.
::

## Schema by page type

A typical ecommerce site can use this structure:

1. **Site-wide schema** (on all pages):
   - Organization or LocalBusiness
   - WebSite

2. **Product listing/category pages**:
   - WebPage (`CollectionPage`)
   - Breadcrumb

3. **Product detail pages**:
   - Product with all details
   - Breadcrumb

4. **Checkout pages**:
   - WebPage (`CheckoutPage`)

## Related Recipes

- [Setting Up Your Identity](/docs/schema-org/guides/recipes/identity): Define your organization
- [Breadcrumbs](/docs/schema-org/guides/recipes/breadcrumbs): Navigation for product pages
- [FAQ Page](/docs/schema-org/guides/recipes/faq): Product FAQs
