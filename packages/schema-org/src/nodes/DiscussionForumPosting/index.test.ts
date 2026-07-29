import { describe, expect, it } from 'vitest'
import { defineDiscussionForumPosting, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineDiscussionForumPosting', () => {
  it('resolves a forum post and nested comments', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineDiscussionForumPosting({
          headline: 'Very Popular Thread',
          text: 'I went to the concert.',
          author: {
            name: 'Katie Pope',
            url: '/users/katie',
          },
          datePublished: new Date('2026-07-01T08:00:00.000Z'),
          interactionStatistic: {
            '@type': 'InteractionCounter',
            'interactionType': 'LikeAction',
            'userInteractionCount': 27,
          },
          comment: {
            text: 'Who did you go with?',
            author: {
              name: 'Saul Douglas',
            },
            datePublished: '2026-07-01T09:00:00+00:00',
          },
        }),
      ])

      expect(await injectSchemaOrg(head)).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#discussion-forum-posting",
            "@type": "DiscussionForumPosting",
            "author": {
              "@type": "Person",
              "name": "Katie Pope",
              "url": "https://example.com/users/katie",
            },
            "comment": {
              "@type": "Comment",
              "author": {
                "@type": "Person",
                "name": "Saul Douglas",
              },
              "datePublished": "2026-07-01T09:00:00+00:00",
              "text": "Who did you go with?",
            },
            "datePublished": "2026-07-01T08:00:00.000Z",
            "headline": "Very Popular Thread",
            "interactionStatistic": {
              "@type": "InteractionCounter",
              "interactionType": "LikeAction",
              "userInteractionCount": 27,
            },
            "text": "I went to the concert.",
            "url": "https://example.com/",
          },
        ]
      `)
    })
  })
})
