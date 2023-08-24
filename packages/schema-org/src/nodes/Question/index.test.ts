import { describe, expect, it } from 'vitest'
import { injectSchemaOrg, useSetup } from '../../../.test'
import { defineQuestion, defineWebPage, useSchemaOrg } from '../../'

describe('defineQuestion', () => {
  it('can be registered', async () => {
    await useSetup(async () => {
      useSchemaOrg([
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

      const graphNodes = await injectSchemaOrg()

      expect(graphNodes).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/frequently-asked-questions/#webpage",
            "@type": [
              "WebPage",
              "FAQPage",
            ],
            "mainEntity": [
              {
                "@id": "https://example.com/frequently-asked-questions/#/schema/question/1dbbae0",
              },
              {
                "@id": "https://example.com/frequently-asked-questions/#/schema/question/39eca17",
              },
            ],
            "name": "FAQ",
            "url": "https://example.com/frequently-asked-questions",
          },
          {
            "@id": "https://example.com/frequently-asked-questions/#/schema/question/1dbbae0",
            "@type": "Question",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Long",
            },
            "inLanguage": "en-AU",
            "name": "How long is a piece of string?",
          },
          {
            "@id": "https://example.com/frequently-asked-questions/#/schema/question/39eca17",
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
