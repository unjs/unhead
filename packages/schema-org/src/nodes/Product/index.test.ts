import type { WebSite } from '../WebSite'
import { expect } from 'vitest'
import { defineAggregateRating, definePerson, defineProduct, defineWebSite, useSchemaOrg } from '../../'
import { findNode, injectSchemaOrg, useSetup } from '../../../test'
import { IdentityId, idReference } from '../../utils'
import { PrimaryWebSiteId } from '../WebSite'

describe('defineProduct', () => {
  it('can be registered', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineProduct({
          name: 'test',
          image: '/product.png',
          offers: [
            {
              price: 50,
              priceValidUntil: '2023-12-30T00:00:00.000Z',
            },
          ],
          aggregateRating: defineAggregateRating({
            ratingCount: 88,
            reviewCount: 20,
            ratingValue: '4.5',
          }),
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
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#product",
            "@type": "Product",
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingCount": 88,
              "ratingValue": "4.5",
              "reviewCount": 20,
            },
            "image": {
              "@id": "https://example.com/#/schema/image/f2d5ce5",
            },
            "name": "test",
            "offers": {
              "@type": "Offer",
              "availability": "https://schema.org/InStock",
              "price": 50,
              "priceCurrency": "AUD",
              "priceValidUntil": "2023-12-30T00:00:00.000Z",
            },
            "review": {
              "@type": "Review",
              "author": {
                "@type": "Person",
                "name": "Harlan Wilton",
              },
              "inLanguage": "en-AU",
              "name": "Awesome product!",
              "reviewRating": {
                "@type": "Rating",
                "bestRating": 5,
                "ratingValue": 5,
                "worstRating": 1,
              },
            },
            "sku": "3104ae4",
          },
          {
            "@id": "https://example.com/#/schema/image/f2d5ce5",
            "@type": "ImageObject",
            "contentUrl": "https://example.com/product.png",
            "inLanguage": "en-AU",
            "url": "https://example.com/product.png",
          },
        ]
      `)
    })
  })

  it('sets up publisher as identity', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        definePerson({
          name: 'Harlan Wilton',
          image: '/image/me.png',
        }),
        defineWebSite({
          name: 'test',
        }),
      ])

      const website = await findNode<WebSite>(head, PrimaryWebSiteId)
      const identity = await findNode<WebSite>(head, IdentityId)

      expect(website?.publisher).toEqual(idReference(identity!))
    })
  })

  it('merchant listing experience', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineProduct({
          sku: 'trinket-12345',
          gtin14: '12345678901234',
          image: [
            'https://example.com/photos/16x9/trinket.jpg',
            'https://example.com/photos/4x3/trinket.jpg',
            'https://example.com/photos/1x1/trinket.jpg',
          ],
          name: 'Nice trinket',
          description: 'Trinket with clean lines',
          brand: {
            '@type': 'Brand',
            'name': 'MyBrand',
          },
          offers: {
            url: 'https://www.example.com/trinket_offer',
            itemCondition: 'https://schema.org/NewCondition',
            availability: 'https://schema.org/InStock',
            price: 39.99,
            priceCurrency: 'USD',
            priceValidUntil: '2020-11-20',
            shippingDetails: {
              shippingRate: {
                value: 3.49,
                currency: 'USD',
              },
              shippingDestination: {
                addressCountry: 'US',
              },
              deliveryTime: {
                handlingTime: {
                  minValue: 0,
                  maxValue: 1,
                  unitCode: 'DAY',
                },
                transitTime: {
                  minValue: 1,
                  maxValue: 5,
                  unitCode: 'DAY',
                },
              },
            },
          },
          review: {
            reviewRating: {
              ratingValue: 4,
              bestRating: 5,
            },
            author: {
              name: 'Fred Benson',
            },
          },
          aggregateRating: {
            ratingValue: 4.4,
            reviewCount: 89,
          },
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(JSON.stringify(graphNodes)).toMatchInlineSnapshot(`"[{"@id":"https://example.com/#product","@type":"Product","description":"Trinket with clean lines","gtin14":"12345678901234","name":"Nice trinket","sku":"trinket-12345","aggregateRating":{"@type":"AggregateRating","ratingValue":4.4,"reviewCount":89},"brand":{"@type":"Brand","name":"MyBrand"},"image":["https://example.com/photos/16x9/trinket.jpg","https://example.com/photos/4x3/trinket.jpg","https://example.com/photos/1x1/trinket.jpg"],"offers":{"@type":"Offer","availability":"https://schema.org/InStock","url":"https://www.example.com/trinket_offer","itemCondition":"https://schema.org/NewCondition","price":39.99,"priceCurrency":"USD","priceValidUntil":"2020-11-20","shippingDetails":{"@type":"OfferShippingDetails","shippingRate":{"@type":"MonetaryAmount","value":3.49,"currency":"USD"},"shippingDestination":{"@type":"DefinedRegion","addressCountry":"US"},"deliveryTime":{"@type":"ShippingDeliveryTime","handlingTime":{"@type":"QuantitativeValue","minValue":0,"maxValue":1,"unitCode":"DAY"},"transitTime":{"@type":"QuantitativeValue","minValue":1,"maxValue":5,"unitCode":"DAY"}}}},"review":{"@type":"Review","reviewRating":{"@type":"Rating","bestRating":5,"worstRating":1,"ratingValue":4},"author":{"@type":"Person","name":"Fred Benson"},"inLanguage":"en-AU"}}]"`)
    })
  })
})
