import { defineHeadPlugin } from '@unhead/shared'
import type { Head, HeadEntry } from '@unhead/schema'

export interface InferSeoMetaPluginOptions {
  /**
   * Transform the og title.
   *
   * @param title
   */
  ogTitle?: string | ((title: string) => string)
  /**
   * Transform the og description.
   *
   * @param title
   */
  ogDescription?: string | ((description: string) => string)
  /**
   * Whether robot meta should be infered.
   *
   * @default true
   */
  robots?: false | string
  /**
   * The twitter card to use.
   *
   * @default 'summary_large_image'
   */
  twitterCard?: false | 'summary' | 'summary_large_image' | 'app' | 'player'
}

export const InferSeoMetaPlugin = (options?: InferSeoMetaPluginOptions) => {
  options = options || {}
  const ogTitleTemplate = options.ogTitle || '%s'
  const ogDescriptionTemplate = options.ogDescription || '%s'
  return defineHeadPlugin({
    hooks: {
      entries: {
        resolve({ entries }) {
          let hasOgImage = false
          for (const entry of entries) {
            const inputKey = entry.resolvedInput ? 'resolvedInput' : 'input'
            const input = entry[inputKey]
            const resolvedMeta: Required<Head>['meta'] = input.meta || []
            const title = input.title
            const ogTitle = resolvedMeta.find(meta => meta.property === 'og:title')
            hasOgImage = hasOgImage || !!resolvedMeta.find(meta => meta.property === 'og:image')
            const description = resolvedMeta.find(meta => meta.name === 'description')?.content
            const ogDescription = resolvedMeta.find(meta => meta.property === 'og:description')
            // ensure meta exists
            entry[inputKey].meta = input.meta || []
            if (title && !ogTitle) {
              entry[inputKey].meta.push({
                property: 'og:title',
                content: (typeof ogTitleTemplate === 'function' ? ogTitleTemplate(title) : ogTitleTemplate).replace('%s', title),
              })
            }
            if (description && !ogDescription) {
              const desc = String(description)
              entry[inputKey].meta.push({
                property: 'og:description',
                content: (typeof ogDescriptionTemplate === 'function' ? ogDescriptionTemplate(desc) : ogDescriptionTemplate).replace('%s', desc),
              })
            }
          }

          const metas: Required<Head>['meta'] = []
          if (options?.robots !== false) {
            metas.push({
              name: 'robots',
              content: options?.robots || 'max-snippet: -1; max-image-preview: large; max-video-preview: -1',
            })
          }
          if (hasOgImage && options?.twitterCard !== false) {
            metas.push({
              property: 'twitter:card',
              content: options?.twitterCard || 'summary_large_image',
            })
          }
          // @todo move to sane defaults plugin
          const rootEntry: HeadEntry<Head> = {
            _i: -1,
            _sde: {},
            input: {
              meta: metas,
            },
          }
          entries.unshift(rootEntry)
        },
      },
    },
  })
}
