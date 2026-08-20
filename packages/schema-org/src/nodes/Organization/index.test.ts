import { expect } from 'vitest'
import { organizationResolver } from '.'
import { defineOrganization, defineWebPage, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineOrganization', () => {
  it('sets webpage about to the identity on the homepage', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineOrganization({ name: 'RankEval' }),
        defineWebPage(),
      ])

      const graph = await injectSchemaOrg(head)
      const webPage = graph.find(node => node['@id'] === 'https://example.com/#webpage')

      expect(webPage?.about).toEqual({ '@id': 'https://example.com/#identity' })
    })
  })

  it('does not set webpage about to the identity off the homepage', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineOrganization({ name: 'RankEval' }),
        defineWebPage(),
      ])

      const graph = await injectSchemaOrg(head)
      const webPage = graph.find(node => node['@id'] === 'https://example.com/orgs/rustopia#webpage')

      expect(webPage).toBeDefined()
      expect(webPage).not.toHaveProperty('about')
    }, { path: '/orgs/rustopia' })
  })

  it('keeps a logo when the identity type is resolved from the default', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        {
          name: 'test',
          logo: '/logo.png',
          _resolver: {
            ...organizationResolver,
            defaults: undefined,
          },
        },
      ])

      const graph = await injectSchemaOrg(head)
      const identity = graph.find(node => node['@id'] === 'https://example.com/#identity')

      expect(identity).toMatchObject({
        '@type': 'Organization',
        'logo': { '@id': 'https://example.com/#logo' },
      })
      expect(graph.some(node => node['@id'] === 'https://example.com/#organization')).toBe(false)
    })
  })

  it('keeps a logo on the identity organization', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineOrganization({
          name: 'test',
          logo: '/logo.png',
          address: {
            addressCountry: 'Australia',
            postalCode: '2000',
            streetAddress: '123 st',
          },
        }),
      ])

      const client = await injectSchemaOrg(head)

      expect(client).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#identity",
            "@type": "Organization",
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "Australia",
              "postalCode": "2000",
              "streetAddress": "123 st",
            },
            "logo": {
              "@id": "https://example.com/#logo",
            },
            "name": "test",
            "url": "https://example.com/",
          },
          {
            "@id": "https://example.com/#logo",
            "@type": "ImageObject",
            "caption": "test",
            "contentUrl": "https://example.com/logo.png",
            "inLanguage": "en-AU",
            "url": "https://example.com/logo.png",
          },
        ]
      `)
    })
  })

  it('uses the first logo when multiple images are provided', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineOrganization({
          name: 'test',
          logo: ['/primary-logo.png', '/alternate-logo.png'],
        }),
      ])

      const graph = await injectSchemaOrg(head)
      const organization = graph.find(node => node['@id'] === 'https://example.com/#identity')
      const logo = graph.find(node => node['@id'] === 'https://example.com/#logo')

      expect(organization?.logo).toEqual({ '@id': 'https://example.com/#logo' })
      expect(logo?.contentUrl).toBe('https://example.com/primary-logo.png')
      expect(graph.filter(node => node['@type'] === 'Organization')).toHaveLength(1)
      expect(graph.filter(node => node['@type'] === 'ImageObject')).toHaveLength(1)
    })
  })

  it('retains a compact node for specialized organizations', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineOrganization({
          '@type': 'Corporation',
          'name': 'test',
          'logo': '/logo.png',
        }),
      ])

      const graph = await injectSchemaOrg(head)
      const identity = graph.find(node => node['@id'] === 'https://example.com/#identity')
      const organization = graph.find(node => node['@id'] === 'https://example.com/#organization')

      expect(identity).toMatchObject({ '@type': ['Organization', 'Corporation'] })
      expect(identity).not.toHaveProperty('logo')
      expect(organization).toMatchObject({
        '@type': 'Organization',
        'logo': 'https://example.com/logo.png',
      })
    })
  })

  it('resolves Google loyalty and shipping policy fields', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineOrganization({
          name: 'Shop',
          identifier: {
            name: 'Merchant ID',
            value: 'shop-1',
          },
          agentInteractionStatistic: {
            interactionType: 'WriteAction',
            userInteractionCount: 3,
          },
          hasMemberProgram: {
            name: 'Shop Plus',
            description: 'Member prices and points',
            url: '/members',
            hasTiers: {
              name: 'Gold',
              hasTierBenefit: ['TierBenefitLoyaltyPoints', 'TierBenefitLoyaltyPrice'],
              hasTierRequirement: {
                currency: 'AUD',
                value: 100,
              },
              membershipPointsEarned: {
                value: 2,
              },
              url: '/members/gold',
            },
          },
          hasShippingService: {
            name: 'Standard',
            fulfillmentType: 'FulfillmentTypeDelivery',
            handlingTime: {
              businessDays: ['Monday', 'Tuesday'],
              duration: {
                minValue: 0,
                maxValue: 2,
                unitCode: 'DAY',
              },
            },
            shippingConditions: {
              shippingDestination: {
                addressCountry: 'AU',
              },
              shippingRate: {
                currency: 'AUD',
                value: 10,
              },
              transitTime: {
                duration: {
                  minValue: 2,
                  maxValue: 4,
                  unitCode: 'DAY',
                },
              },
            },
          },
        }),
      ])

      const [organization] = await injectSchemaOrg(head)

      expect(organization).toMatchObject({
        agentInteractionStatistic: {
          '@type': 'InteractionCounter',
        },
        identifier: {
          '@type': 'PropertyValue',
        },
        hasMemberProgram: {
          '@type': 'MemberProgram',
          'hasTiers': {
            '@type': 'MemberProgramTier',
            'hasTierBenefit': [
              'https://schema.org/TierBenefitLoyaltyPoints',
              'https://schema.org/TierBenefitLoyaltyPrice',
            ],
            'hasTierRequirement': {
              '@type': 'MonetaryAmount',
            },
            'membershipPointsEarned': {
              '@type': 'QuantitativeValue',
              'value': 2,
            },
            'url': 'https://example.com/members/gold',
          },
          'url': 'https://example.com/members',
        },
        hasShippingService: {
          '@type': 'ShippingService',
          'fulfillmentType': 'https://schema.org/FulfillmentTypeDelivery',
          'handlingTime': {
            '@type': 'ServicePeriod',
            'duration': {
              '@type': 'QuantitativeValue',
            },
          },
          'shippingConditions': {
            '@type': 'ShippingConditions',
            'shippingDestination': {
              '@type': 'DefinedRegion',
            },
            'shippingRate': {
              '@type': 'MonetaryAmount',
            },
            'transitTime': {
              '@type': 'ServicePeriod',
            },
          },
        },
      })
    })
  })
})
