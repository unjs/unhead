import { defineHeadPlugin } from 'unhead'

export interface InferSeoMetaPluginOptions {
  /**
   * Transform the og title.
   *
   * @param title
   */
  ogTitle?: (title: string) => string
  /**
   * Transform the og description.
   *
   * @param title
   */
  ogDescription?: (description: string) => string
  /**
   * Whether robot meta should be infered.
   *
   * @default true
   */
  robots?: boolean
  /**
   * The twitter card to use.
   *
   * @default 'summary_large_image'
   */
  twitterCard?: string
}

export const InferSeoMetaPlugin = (options?: InferSeoMetaPluginOptions) => defineHeadPlugin({
  hooks: {
    tags: {
      resolve(ctx) {
        const tags = ctx.tags.reverse()
        const title = tags.find(t => t.tag === 'title' && !!t.children)
        const ogTitle = tags.find(t => t.tag === 'meta' && t.props.property === 'og:title' && t._e === title?._e)
        if (title && !ogTitle) {
          ctx.tags.push({
            // note: we need to add this new tag to the useHead entry of title
            // (if title is removed, we remove this tag too)
            _e: title._e,
            tag: 'meta',
            props: {
              property: 'og:title',
              content: options?.ogTitle ? options.ogTitle(title.children!) : title.children,
            },
          })
        }
        const description = ctx.tags.find(t => t.tag === 'meta' && t.props.name === 'description' && !!t.props.content)
        const ogDescription = tags.find(t => t.tag === 'meta' && t.props.property === 'og:description' && t._e === description?._e)
        if (description && !ogDescription) {
          ctx.tags.push({
            _e: description._e,
            tag: 'meta',
            props: {
              name: 'og:description',
              content: options?.ogDescription ? options.ogDescription(description.props.content) : description.props.content,
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
              content: options?.twitterCard || 'summary_large_image',
            },
          })
        }
        if (options?.robots !== false && !ctx.tags.find(t => t.tag === 'meta' && t.props.name === 'robots')) {
          ctx.tags.push({
            _e: ctx.tags[0]._e,
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
