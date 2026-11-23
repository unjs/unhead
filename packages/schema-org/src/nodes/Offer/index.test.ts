import type { Offer } from '.'
import { describe, expect, it } from 'vitest'
import { defineProduct, useSchemaOrg } from '../..'
import { injectSchemaOrg, useSetup } from '../../../test'

async function resolveOffer(offers: Offer) {
  let offer: Record<string, unknown> | undefined
  await useSetup(async (head) => {
    useSchemaOrg(head, [
      defineProduct({
        name: 'Desk chair',
        image: '/chair.png',
        offers,
      }),
    ])

    const graph = await injectSchemaOrg(head)
    offer = graph.find(node => node['@type'] === 'Product')!.offers as Record<string, unknown>
  })
  return offer
}

describe('offer', () => {
  it('stamps the site currency on an offer with a price', async () => {
    expect(await resolveOffer({ price: 50 })).toEqual({
      '@type': 'Offer',
      'price': 50,
      'priceCurrency': 'AUD',
    })
  })

  it('keeps the site currency off an offer priced only through a price specification', async () => {
    expect(await resolveOffer({
      priceSpecification: {
        price: 50,
        priceCurrency: 'USD',
      },
    })).toEqual({
      '@type': 'Offer',
      'priceSpecification': {
        '@type': 'UnitPriceSpecification',
        'price': 50,
        'priceCurrency': 'USD',
      },
    })
  })

  it('serializes validThrough as an ISO 8601 date', async () => {
    const offer = await resolveOffer({
      price: 50,
      validThrough: 'Wed, 31 Dec 2025 00:00:00 GMT',
    })

    expect(offer?.validThrough).toBe('2025-12-31T00:00:00.000Z')
  })
})
