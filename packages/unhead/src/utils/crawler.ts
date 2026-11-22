import type { HeadTag } from '../types'

/** `meta` names and properties that only crawlers read: `og:*`, `twitter:*`, `article:*`, and three names. */
const CRAWLER_META_RE = /^(?:(?:og|twitter|article):|(?:description|robots|keywords)$)/i

/** Whether a resolved `meta` name or property is on the crawler tag list. */
export function isCrawlerMetaKey(key: string): boolean {
  return CRAWLER_META_RE.test(key)
}

/**
 * Whether a resolved tag is on the crawler tag list of the `serverOnlyCrawlerTags`
 * build option: crawler `meta`, `link rel=canonical`, `link rel=alternate` with
 * `hreflang`, and JSON-LD scripts.
 */
export function isCrawlerTag(tag: HeadTag): boolean {
  const p = tag.props
  if (tag.tag === 'meta')
    return CRAWLER_META_RE.test(p.name || p.property || '')
  if (tag.tag === 'link') {
    const rel = String(p.rel).toLowerCase()
    return rel === 'canonical' || (rel === 'alternate' && p.hreflang != null)
  }
  return tag.tag === 'script' && String(p.type).toLowerCase() === 'application/ld+json'
}
