import { defineHeadPlugin } from 'unhead'
import {Head, HeadEntry} from "@unhead/schema";

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
    entries: {
      resolve({ entries }) {
        for(const entry of entries) {
          const inputKey = entry.resolvedInput ? 'resolvedInput' : 'input'
          const input = entry[inputKey]
          const resolvedMeta : Required<Head>['meta'] = input.meta || []
          const title = input.title
          const ogTitle = resolvedMeta.find(meta => meta.property === 'og:title')
          const description = resolvedMeta.find(meta => meta.name === 'description')?.content
          const ogDescription = resolvedMeta.find(meta => meta.property === 'og:description')

          if (title && !ogTitle) {
            entry[inputKey].meta.push({
              property: 'og:title',
              content: options?.ogTitle ? options.ogTitle(title) : title,
            })
          }
          if (description && !ogDescription) {
            entry[inputKey].meta.push({
              property: 'og:description',
              content: options?.ogDescription ? options.ogDescription(String(description)) : description,
            })
          }
        }
        const rootEntry: HeadEntry<Head> = {
          _i: -1,
          _sde: {},
          input: {
            meta: [
              {
                property: 'twitter:card',
                content: options?.twitterCard || 'summary_large_image',
                tagPriority: 'low',
              },
              {
                name: 'robots',
                content: 'max-snippet: -1; max-image-preview: large; max-video-preview: -1',
                tagPriority: 'low',
              }
            ]
          }
        }
        entries.unshift(rootEntry)
      }
    },
  },
})
