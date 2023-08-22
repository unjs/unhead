import { expect } from 'vitest'
import { injectSchemaOrg, useSetup } from '../../../.test'
import { defineOrganization, useSchemaOrg } from '../../'

describe('defineOrganization', () => {
  it('can be registered', async () => {
    await useSetup(async () => {
      useSchemaOrg([
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

      const client = await injectSchemaOrg()

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
})
