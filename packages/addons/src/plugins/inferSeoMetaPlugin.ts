import { defineHeadPlugin } from '@unhead/shared'
import type { Head } from '@unhead/schema'

export interface InferSeoMetaPluginOptions {
  /**
   * Transform the og title.
   *
   * @param title
   */
  ogTitle?: ((title: string) => string)
  /**
   * Transform the og description.
   *
   * @param title
   */
  ogDescription?: ((description: string) => string)
  /**
   * The twitter card to use.
   *
   * @default 'summary_large_image'
   */
  twitterCard?: false | 'summary' | 'summary_large_image' | 'app' | 'player'
}

export const InferSeoMetaPlugin = (options?: InferSeoMetaPluginOptions) => {
  options = options || {}
  return defineHeadPlugin({
    hooks: {
      entries: {
        resolve({ entries }) {
          for (const entry of entries) {
            const inputKey = entry.resolvedInput ? 'resolvedInput' : 'input'
            const input = entry[inputKey]
            const resolvedMeta: Required<Head>['meta'] = input.meta || []
            const title = input.title
            const description = resolvedMeta.find(meta => meta.name === 'description')?.content

            const hasOgTitle = !!resolvedMeta.find(meta => meta.property === 'og:title')
            const hasOgImage = !!resolvedMeta.find(meta => meta.property === 'og:image')
            const hasTwitterCard = !!resolvedMeta.find(meta => meta.property === 'twitter:card')
            const hasOgDescription = !!resolvedMeta.find(meta => meta.property === 'og:description')

            // ensure meta exists
            entry[inputKey].meta = input.meta || []
            if (title && !hasOgTitle) {
              let newOgTitle = options?.ogTitle || title
              if (typeof newOgTitle === 'function')
                newOgTitle = newOgTitle(title)

              if (newOgTitle) {
                entry[inputKey].meta.push({
                  property: 'og:title',
                  // have the og:title be removed if we don't have a title
                  content: String(newOgTitle),
                })
              }
            }
            if (description && !hasOgDescription) {
              let newOgDescription = options?.ogDescription || description
              if (typeof newOgDescription === 'function')
                newOgDescription = newOgDescription(title)

              if (newOgDescription) {
                entry[inputKey].meta.push({
                  property: 'og:description',
                  content: String(newOgDescription),
                })
              }
            }
            if (hasOgImage && !hasTwitterCard) {
              entry[inputKey].meta.push({
                name: 'twitter:card',
                content: options?.twitterCard || 'summary_large_image',
              })
            }
          }
        },
      },
    },
  })
}
