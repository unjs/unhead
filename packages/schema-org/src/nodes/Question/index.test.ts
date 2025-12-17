import { describe, expect, it } from 'vitest'
import { defineQuestion, defineWebPage, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineQuestion', () => {
  it('can be registered', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineWebPage({
          '@type': 'FAQPage',
        }),
        defineQuestion({
          name: 'How long is a piece of string?',
          acceptedAnswer: 'Long',
        }),
        defineQuestion({
          name: 'Why do we ask questions?',
          acceptedAnswer: 'To get an accepted answer',
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/frequently-asked-questions#webpage",
            "@type": [
              "WebPage",
              "FAQPage",
            ],
            "mainEntity": [
              {
                "@id": "https://example.com/frequently-asked-questions#/schema/question/1",
              },
              {
                "@id": "https://example.com/frequently-asked-questions#/schema/question/2",
              },
            ],
            "name": "FAQ",
            "url": "https://example.com/frequently-asked-questions",
          },
          {
            "@id": "https://example.com/frequently-asked-questions#/schema/question/1",
            "@type": "Question",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Long",
            },
            "inLanguage": "en-AU",
            "name": "How long is a piece of string?",
          },
          {
            "@id": "https://example.com/frequently-asked-questions#/schema/question/2",
            "@type": "Question",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "To get an accepted answer",
            },
            "inLanguage": "en-AU",
            "name": "Why do we ask questions?",
          },
        ]
      `)
    }, {
      path: '/frequently-asked-questions',
      title: 'FAQ',
    })
  })
})
