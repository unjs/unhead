import { describe, it } from 'vitest'
import { renderDOMHead } from '@unhead/dom'
import { activeDom, useDOMHead, useDelayedSerializedDom } from '../dom/util'

describe('hooks', () => {
  it('delay dom', async () => {
    const head = useDOMHead({
      hooks: {
        tags: {
          resolve(ctx) {
            const title = ctx.tags.find(t => t.tag === 'title' && !!t.children)
            if (title) {
              ctx.tags.push({
                // note: we need to add this new tag to the useHead entry of title
                // (if title is removed, we remove this tag too)
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
                tag: 'meta',
                props: {
                  property: 'twitter:card',
                  content: 'summary_large_image',
                },
              })
            }
            if (!ctx.tags.find(t => t.tag === 'meta' && t.props.name === 'robots')) {
              ctx.tags.push({
                tag: 'meta',
                props: {
                  name: 'robots',
                  content: 'max-snippet: -1; max-image-preview: large; max-video-preview: -1',
                },
              })
            }
          },
        },
      },
    })

    head.push({
      title: 'Hello World',
      meta: [
        { name: 'description', content: 'description' },
      ],
    })
    // even try a force render
    await renderDOMHead(head, { document: activeDom!.window.document })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <title>Hello World</title><meta name=\\"description\\" content=\\"description\\"><meta property=\\"og:title\\" content=\\"Hello World\\"><meta name=\\"robots\\" content=\\"max-snippet: -1; max-image-preview: large; max-video-preview: -1\\"></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
