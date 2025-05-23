import { expect } from 'vitest'
import { defineOrganization, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineOrganization', () => {
  it('can be registered', async () => {
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
          {
            "@id": "https://example.com/#organization",
            "@type": "Organization",
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "Australia",
              "postalCode": "2000",
              "streetAddress": "123 st",
            },
            "logo": "https://example.com/logo.png",
            "name": "test",
            "url": "https://example.com/",
          },
        ]
      `)
    })
  })
})
