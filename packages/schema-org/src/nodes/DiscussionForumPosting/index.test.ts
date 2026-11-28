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
              "interactionType": "https://schema.org/LikeAction",
              "userInteractionCount": 27,
            },
            "text": "I went to the concert.",
            "url": "https://example.com/",
          },
        ]
      `)
    })
  })

  it('resolves relative urls and interaction counters', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineDiscussionForumPosting({
          headline: 'Thread',
          text: 'Hello',
          author: { name: 'Katie Pope' },
          datePublished: '2026-07-01T08:00:00+00:00',
          url: '/forum/threads/1',
          isPartOf: '/forum',
          interactionStatistic: { interactionType: 'LikeAction', userInteractionCount: 3 },
          comment: {
            text: 'Hi',
            author: { name: 'Saul Douglas' },
            datePublished: '2026-07-01T09:00:00+00:00',
            url: '/forum/threads/1#c1',
            interactionStatistic: { interactionType: 'LikeAction', userInteractionCount: 1 },
          },
        }),
      ])
      const post = (await injectSchemaOrg(head)).find((n: any) => n['@type'] === 'DiscussionForumPosting')
      const counter = (count: number) => ({ '@type': 'InteractionCounter', 'interactionType': 'https://schema.org/LikeAction', 'userInteractionCount': count })
      expect(post).toMatchObject({
        url: 'https://example.com/forum/threads/1',
        isPartOf: 'https://example.com/forum',
        interactionStatistic: counter(3),
        comment: { url: 'https://example.com/forum/threads/1#c1', interactionStatistic: counter(1) },
      })
    })
  })
})
