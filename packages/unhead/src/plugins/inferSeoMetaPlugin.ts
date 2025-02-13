import { defineHeadPlugin } from '../utils/defineHeadPlugin'

export interface InferSeoMetaPluginOptions {
  /**
   * Transform the og title.
   *
   * @param title
   */
  ogTitle?: ((title?: string) => string)
  /**
   * Transform the og description.
   *
   * @param title
   */
  ogDescription?: ((description?: string) => string)
  /**
   * The twitter card to use.
   *
   * @default 'summary_large_image'
   */
  twitterCard?: false | 'summary' | 'summary_large_image' | 'app' | 'player'
}

export function InferSeoMetaPlugin(options: InferSeoMetaPluginOptions = {}) {
  return defineHeadPlugin((head) => {
    head.push({
      meta: [
        {
          name: 'twitter:card',
          content: options.twitterCard || 'summary_large_image',
          tagPriority: 'low',
        },
        {
          property: 'og:title',
          content: '%infer',
          tagPriority: 'low',
        },
        {
          property: 'og:description',
          content: '%infer',
          tagPriority: 'low',
        },
      ],
    })
    return {
      key: 'infer-seo-meta',
      hooks: {
        'tags:beforeResolve': ({ tagMap }) => {
          let title = head._title || ''
          const titleTemplate = head._titleTemplate
          // check if the current title is %infer
          const ogTitle = tagMap.get('meta:og:title')
          if (ogTitle?.props?.content === '%infer') {
            if (titleTemplate) {
              // @ts-expect-error broken types
              title = typeof titleTemplate === 'function' ? titleTemplate(title) : titleTemplate.replace('%s', title)
            }
            ogTitle.props!.content = options.ogTitle ? options.ogTitle(title) : title || ''
          }

          const description = tagMap.get('meta:description')?.props?.content
          const ogDescription = tagMap.get('meta:og:description')
          if (ogDescription?.props?.content === '%infer') {
            ogDescription.props!.content = options.ogDescription ? options.ogDescription(description) : description || ''
          }
        },
      },
    }
  })
}
