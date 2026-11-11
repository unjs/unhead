import type { HeadTag } from '../types'
import { isCrawlerTag } from '../utils/crawler'
import { defineHeadPlugin } from './defineHeadPlugin'

/**
 * Removes crawler tags from resolved client tags, so the DOM renderer never
 * tracks them: it never writes, changes, or removes their server elements.
 *
 * The `serverOnlyCrawlerTags` bundler option registers it on client heads.
 * Other builds never import it, so it costs them no bytes.
 */
export const ServerOnlyCrawlerTagsPlugin = /* @__PURE__ */ defineHeadPlugin({
  key: 'serverOnlyCrawlerTags',
  hooks: {
    'tags:afterResolve': (ctx) => {
      ctx.tags = ctx.tags.filter((t: HeadTag) => !isCrawlerTag(t))
    },
  },
})
