import { expect } from 'vitest'
import { defineService, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineService', () => {
  it('can be defined', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineService({
          name: 'Web Design Services',
          serviceType: 'Web Design',
          provider: {
            name: 'Design Studio Inc.',
          },
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#service",
            "@type": "Service",
            "name": "Web Design Services",
            "provider": {
              "name": "Design Studio Inc.",
            },
            "serviceType": "Web Design",
          },
        ]
      `)
    })
  })
})
