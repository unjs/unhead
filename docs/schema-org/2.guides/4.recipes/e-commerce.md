---
title: Schema.org for eCommerce Sites
description: Learn how to implement Schema.org for eCommerce websites to improve search visibility and product rich results.
navigation:
  title: eCommerce
---

Use `defineProduct()` with `offers`, `aggregateRating`, and `review` properties to enable product rich results. Google can display price, availability, ratings, and review counts directly in search results.

::note
Product structured data enables rich snippets showing prices, star ratings, stock status, and reviews - significantly improving visibility and click-through rates for eCommerce pages.
::

## Useful Links

- [defineProduct](/docs/schema-org/api/schema/product)
- [Product | Google Search Central](https://developers.google.com/search/docs/advanced/structured-data/product)
- [Product | Yoast](https://developer.yoast.com/features/schema/pieces/product)

## How do I mark up a product?

[defineProduct](/docs/schema-org/api/schema/product) creates Product Schemas whilst handling relations for you.

Note that some fields may already be inferred, see [Schema.org Params](/docs/schema-org/guides/core-concepts/params)

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

## What does a complete product schema look like?

For optimal product markup, include as much information as possible:

```ts
import { defineProduct, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineProduct({
    name: 'Premium Ergonomic Office Chair',
    description: 'High-quality office chair with lumbar support and adjustable height.',
    image: [
      'https://example.com/images/chair-front.jpg',
      'https://example.com/images/chair-side.jpg',
      'https://example.com/images/chair-back.jpg'
    ],
    sku: 'CHAIR-123',
    mpn: 'ERGO-2023-BLK',
    gtin13: '9780123456789',
    brand: {
      name: 'ErgoComfort'
    },
    offers: {
      price: 299.99,
      priceCurrency: 'USD',
      priceValidUntil: '2023-12-31',
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

## How do I mark up product variants?

For products with multiple variants (color, size, etc.), use the following approach:

```ts
import { defineProduct, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineProduct({
    name: 'Cotton T-Shirt',
    description: 'Comfortable 100% cotton t-shirt, available in multiple colors and sizes.',
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

## What are the product availability values?

For the `availability` property, use one of these Schema.org values:

- `https://schema.org/InStock`: Item is in stock
- `https://schema.org/OutOfStock`: Item is out of stock
- `https://schema.org/PreOrder`: Item is available for pre-order
- `https://schema.org/Discontinued`: Item has been discontinued
- `https://schema.org/BackOrder`: Item is on backorder and will be available later
- `https://schema.org/InStoreOnly`: Item is available only in physical stores
- `https://schema.org/OnlineOnly`: Item is available only online
- `https://schema.org/SoldOut`: Item is sold out

## How do I mark up a product collection page?

For category or collection pages that list multiple products, use the CollectionPage type:

```ts
import { defineWebPage, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineWebPage({
    '@type': 'CollectionPage',
    'name': 'Office Furniture Collection',
    'description': 'Browse our collection of high-quality office furniture.'
  })
])
```

## How do I mark up shopping cart and checkout pages?

For shopping cart and checkout pages, you can use specific page types:

```ts
import { defineWebPage, useSchemaOrg } from '@unhead/schema-org/@framework'

// For a shopping cart page
useSchemaOrg([
  defineWebPage({
    '@type': 'CheckoutPage',
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

## How do I set up a store's identity?

For eCommerce sites, it's important to establish your brand's identity. This can be done using [Organization](/docs/schema-org/api/schema/organization) or [LocalBusiness](/docs/schema-org/api/schema/local-business) depending on whether your store has a physical location.

See the [Identity](/docs/schema-org/guides/recipes/identity) guide for more details.

```ts
// Organization Example
import { defineOrganization, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineOrganization({
    name: 'My eCommerce Store',
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

## What are the best practices for eCommerce schema?

1. **Include all product details**: Provide complete information including prices, SKUs, availability, and images.

2. **Update availability regularly**: Keep product availability status up-to-date to avoid misleading users.

3. **Add multiple images**: Include several high-quality product images from different angles.

4. **Include reviews**: Genuine customer reviews and aggregate ratings improve trust signals.

5. **Use structured data testing**: Regularly test your schema with [Google's Rich Results Test](https://search.google.com/test/rich-results).

6. **Keep pricing accurate**: Ensure pricing information matches what's displayed on your website.

7. **Include breadcrumbs**: Add [breadcrumb navigation](/docs/schema-org/guides/recipes/breadcrumbs) to help users understand your site structure.

8. **Ensure consistency**: Make sure your schema markup matches the visible content on your page.

9. **Add brand information**: Clearly identify the brand of each product to help with brand recognition.

10. **Link to product URLs**: Each product variant should link to its specific URL for direct access.

::tip
For comprehensive eCommerce SEO, combine product schema with other relevant schemas like breadcrumbs, FAQ (for product questions), and organization/local business schemas.
::

## What schema should I use on different eCommerce pages?

For a typical eCommerce site, consider implementing this schema structure:

1. **Site-wide schema** (on all pages):
   - Organization or LocalBusiness
   - WebSite with SearchAction

2. **Product listing/category pages**:
   - WebPage (CollectionPage)
   - Breadcrumb

3. **Product detail pages**:
   - Product with all details
   - Breadcrumb
   - Optional: FAQPage (for product Q&A)

4. **Checkout pages**:
   - WebPage (CheckoutPage)

This comprehensive structure helps search engines understand your eCommerce site and can improve visibility for your products in search results.

## Related Recipes

- [Setting Up Your Identity](/docs/schema-org/guides/recipes/identity) - Define your organization
- [Breadcrumbs](/docs/schema-org/guides/recipes/breadcrumbs) - Navigation for product pages
- [FAQ Page](/docs/schema-org/guides/recipes/faq) - Product FAQs
