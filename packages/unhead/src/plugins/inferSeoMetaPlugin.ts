import { defineHeadPlugin } from './defineHeadPlugin'

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
   * @param description
   */
  ogDescription?: ((description?: string) => string)
  /**
   * The twitter card to use.
   *
   * @deprecated Twitter/X renders link previews from Open Graph metadata. Set this to `false` and rely on Open Graph metadata instead.
   * @default 'summary_large_image'
   */
  twitterCard?: false | 'summary' | 'summary_large_image' | 'app' | 'player'
}

export function InferSeoMetaPlugin(options: InferSeoMetaPluginOptions = {}) {
  return defineHeadPlugin((head) => {
    if (options.twitterCard !== false) {
      head.push({
        meta: [
          {
            name: 'twitter:card',
            content: options.twitterCard || 'summary_large_image',
            tagPriority: 'low',
          },
        ],
      })
    }
    head.push({
      meta: [
        // content is intentionally omitted - inferred from title/description by the hook below
        {
          'property': 'og:title',
          'tagPriority': 'low',
          'data-infer': '',
        } as any,
        {
          'property': 'og:description',
          'tagPriority': 'low',
          'data-infer': '',
        } as any,
      ],
    })
    return {
      key: 'infer-seo-meta',
      hooks: {
        'tags:beforeResolve': ({ tagMap }) => {
          const titleSource = head._titleTemplate || head._title
          const title = typeof titleSource === 'function' ? titleSource(head._title) : titleSource
          // check if the current title is %infer
          const ogTitle = tagMap.get('meta:og:title')
          if (typeof ogTitle?.props['data-infer'] !== 'undefined') {
            const resolvedTitle = typeof title === 'string' ? title : undefined
            ogTitle.props!.content = options.ogTitle ? options.ogTitle(resolvedTitle) : resolvedTitle || ''
            ogTitle.processTemplateParams = true
          }

          const description = tagMap.get('meta:description')?.props?.content
          const ogDescription = tagMap.get('meta:og:description')
          if (typeof ogDescription?.props['data-infer'] !== 'undefined') {
            const resolvedDescription = description == null || description === false ? undefined : String(description)
            ogDescription.props!.content = options.ogDescription ? options.ogDescription(resolvedDescription) : resolvedDescription || ''
            ogDescription.processTemplateParams = true
          }
        },
      },
    }
  }, 'infer-seo-meta')
}
