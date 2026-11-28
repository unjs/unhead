import { describe, expect, it } from 'vitest'
import { defineProduct, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('offerShippingDetails', () => {
  it('references an organization shipping service by id', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineProduct({
          name: 'Mug',
          image: '/mug.png',
          offers: {
            price: 20,
            shippingDetails: {
              hasShippingService: { '@id': 'https://example.com/#standard-shipping' },
            },
          },
        }),
      ])
      const product = (await injectSchemaOrg(head)).find((n: any) => n.name === 'Mug')
      expect((product as any).offers.shippingDetails).toEqual({
        '@type': 'OfferShippingDetails',
        'hasShippingService': { '@id': 'https://example.com/#standard-shipping' },
      })
    })
  })
})
