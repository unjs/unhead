---
title: DiscussionForumPosting Schema
description: Add Google discussion forum structured data with defineDiscussionForumPosting(), including authors, comments, media, and interaction counts.
---

## Schema.org DiscussionForumPosting

- **Type**: `defineDiscussionForumPosting(input?: DiscussionForumPosting)`{lang="ts"}

  Describes a user-generated forum or social media post.

## Useful Links

- [Discussion forum markup - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/discussion-forum)
- [DiscussionForumPosting - Schema.org](https://schema.org/DiscussionForumPosting)

## Example

```ts
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
})
```

For a root post, Google requires `author`, `datePublished`, and content supplied through `text`, `image`, or `video`. Posts represented on another page with an external `url` may omit the content property. Use `@type: 'SocialMediaPosting'` for social platforms that are not organized as forums.

## Defaults and resolves

- `@type` defaults to `DiscussionForumPosting`.
- `@id` defaults to `${canonicalUrl}#discussion-forum-posting`.
- Authors resolve to Person or Organization nodes.
- Comments, images, videos, and dates resolve recursively.
- A root post references the primary WebPage through `mainEntityOfPage`.
