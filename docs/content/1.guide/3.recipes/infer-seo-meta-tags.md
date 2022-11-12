---
title: Infer SEO Meta tags
description: Automatically infer SEO meta tags from your page.
---

Unhead is internally powered by a hook system which you can plug into to add your own logic.

One example of this is the inferring the SEO meta tags to display on your page before a render.

## Example

```ts
const head = createHead({
  hooks: {
    tags: {
      resolve(ctx) {
        const title = ctx.tags.find(t => t.tag === 'title' && !!t.children)
        if (title) {
          ctx.tags.push({
            // note: we need to add this new tag to the useHead entry of title
            // (if title is removed, we remove this tag too)
            _e: title._e,
            tag: 'meta',
            props: {
              property: 'og:title',
              content: title.children,
            },
          })
        }
        const description = ctx.tags.find(t => t.tag === 'meta' && t.props.name === 'description' && !!t.props.content)
        if (description) {
          ctx.tags.push({
            _e: description._e,
            tag: 'meta',
            props: {
              name: 'og:description',
              content: description.props.content,
            },
          })
        }
        // if we have an image, add twitter:card if missing
        const ogImage = ctx.tags.find(t => t.tag === 'meta' && t.props.property === 'og:image')
        if (ogImage && !ctx.tags.find(t => t.tag === 'meta' && t.props.property === 'twitter:card')) {
          ctx.tags.push({
            _e: ogImage._e,
            tag: 'meta',
            props: {
              property: 'twitter:card',
              content: 'summary_large_image',
            },
          })
        }
        if (!ctx.tags.find(t => t.tag === 'meta' && t.props.name === 'robots')) {
          ctx.tags.push({
            _e: ctx.tags[0]._e,
            tag: 'meta',
            props: {
              name: 'robots',
              content: 'max-snippet: -1; max-image-preview: large; max-video-preview: -1',
            },
          })
        }
      }
    }
  }
})
```
