import {defineHeadPlugin} from "unhead";

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
        const title = ctx.tags.find(t => t.tag === 'title' && !!t.children)
        if (title) {
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
        if (description) {
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
        if (options?.robots && !ctx.tags.find(t => t.tag === 'meta' && t.props.name === 'robots')) {
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
