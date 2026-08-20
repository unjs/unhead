import { describe, expect, it } from 'vitest'
import { defineQuiz, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineQuiz', () => {
  it('resolves education questions and alignments', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineQuiz({
          about: {
            '@type': 'Thing',
            'name': 'Cell transport',
          },
          educationalAlignment: {
            alignmentType: 'educationalSubject',
            targetName: 'Biology',
          },
          hasPart: {
            text: 'What protects the contents of a cell?',
            eduQuestionType: 'Flashcard',
            acceptedAnswer: 'Cell membrane',
          },
        }),
      ])

      expect(await injectSchemaOrg(head)).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#quiz",
            "@type": "Quiz",
            "about": {
              "@type": "Thing",
              "name": "Cell transport",
            },
            "educationalAlignment": {
              "@type": "AlignmentObject",
              "alignmentType": "educationalSubject",
              "targetName": "Biology",
            },
            "hasPart": {
              "@type": "Question",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Cell membrane",
              },
              "eduQuestionType": "Flashcard",
              "inLanguage": "en-AU",
              "text": "What protects the contents of a cell?",
            },
          },
        ]
      `)
    })
  })
})
