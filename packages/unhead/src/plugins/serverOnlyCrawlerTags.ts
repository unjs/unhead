import type { HeadEntry, HeadTag } from '../types'
import { isCrawlerMetaKey, isCrawlerTag } from '../utils/crawler'
import { defineHeadPlugin } from './defineHeadPlugin'

const CAMEL_CASE_BOUNDARY_RE = /[A-Z]/

/**
 * Removes crawler tags that originate on the client. The DOM renderer still
 * applies crawler tags replayed from the server stream.
 *
 * The bundler registers it on client heads with `serverOnlyCrawlerTags: { runtime: true }`.
 */
export const ServerOnlyCrawlerTagsPlugin = /* @__PURE__ */ defineHeadPlugin({
  key: 'serverOnlyCrawlerTags',
  hooks: {
    'entries:normalize': (ctx: { entry: HeadEntry<unknown>, tags: HeadTag[] }) => {
      if (ctx.entry.options?._streamed)
        return
      // A client duplicate could otherwise replace a server-streamed tag before filtering.
      const tags: HeadTag[] = []
      for (const t of ctx.tags) {
        // FlatMetaPlugin can normalize this entry after this hook.
        if (t.tag === '_flatMeta') {
          // The first camel-case boundary is enough to match a crawler namespace.
          const props = Object.fromEntries(Object.entries(t.props).filter(([key]) => !isCrawlerMetaKey(key.replace(CAMEL_CASE_BOUNDARY_RE, ':$&'))))
          tags.push({ ...t, props })
        }
        else if (!isCrawlerTag(t)) {
          tags.push(t)
        }
      }
      ctx.tags = tags
    },
    'tags:afterResolve': (ctx) => {
      ctx.tags = ctx.tags.filter((t: HeadTag) => t._streamed || !isCrawlerTag(t))
    },
  },
})
