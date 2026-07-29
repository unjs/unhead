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

  it('links questions to QAPage and resolves suggested answers', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineWebPage({
          '@type': 'QAPage',
        }),
        defineQuestion({
          name: 'How should this be configured?',
          answerCount: 1,
          suggestedAnswer: {
            text: 'Use the typed helper.',
            author: {
              '@type': 'Organization',
              'name': 'Unhead',
            },
            datePublished: new Date(Date.UTC(2026, 0, 2)),
            url: '/answers/typed-helper',
          },
        }),
      ])

      const graphNodes = await injectSchemaOrg(head)

      expect(graphNodes[0].mainEntity).toEqual([
        {
          '@id': 'https://example.com/#/schema/question/1',
        },
      ])
      expect(graphNodes[1].suggestedAnswer).toMatchObject({
        '@type': 'Answer',
        'author': {
          '@id': 'https://example.com/#/schema/organization/1',
        },
        'datePublished': '2026-01-02T00:00:00.000Z',
        'url': 'https://example.com/answers/typed-helper',
      })
      expect(graphNodes[2]).toMatchObject({
        '@type': 'Organization',
        'name': 'Unhead',
      })
    })
  })
})
