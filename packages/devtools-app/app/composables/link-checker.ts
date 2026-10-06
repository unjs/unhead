import type { SerializedTag } from './state'
import { resolvePageUrl } from './state'

export interface BrokenLink {
  url: string
  tag: string
  identifier: string
  tagDedupeKey?: string
}

const IMAGE_URL_META = new Set(['og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image', 'twitter:image:src'])
const URL_META = new Set([...IMAGE_URL_META, 'og:url', 'og:video', 'og:video:url', 'og:audio', 'og:audio:url'])
const ICON_RELS = new Set(['icon', 'apple-touch-icon', 'apple-touch-icon-precomposed'])
const IMAGE_EXT_RE = /\.(?:png|jpe?g|gif|svg|ico|webp|avif)(?:\?.*)?$/i
// Head state syncs on every DOM render; check each URL at most once per window.
const RECHECK_MS = 60_000

const checkedAt = new Map<string, number>()

/** All broken link results keyed by URL */
export const brokenLinks = shallowRef(new Map<string, BrokenLink>())
/** Resolved URLs currently being checked */
export const pendingUrls = shallowRef(new Set<string>())

function triggerBrokenLinks() {
  brokenLinks.value = new Map(brokenLinks.value)
}
function triggerPending() {
  pendingUrls.value = new Set(pendingUrls.value)
}

export function isBrokenUrl(url: string): boolean {
  return brokenLinks.value.has(url)
}

function extractCheckableUrls(tags: SerializedTag[]): Array<{ url: string, tag: string, identifier: string, tagDedupeKey?: string }> {
  const results: Array<{ url: string, tag: string, identifier: string, tagDedupeKey?: string }> = []

  for (const t of tags) {
    const dedupeKey = t.dedupeKey || undefined

    // Meta tags with URL values (og:image, twitter:image, og:url, etc.)
    if (t.tag === 'meta') {
      const key = t.props?.property || t.props?.name || ''
      if (URL_META.has(key) && t.props?.content?.startsWith('http')) {
        results.push({ url: t.props.content, tag: t.tag, identifier: key, tagDedupeKey: dedupeKey })
      }
    }

    // Link tags with absolute URLs (stylesheets, canonical, etc.)
    if (t.tag === 'link' && t.props?.href?.startsWith('http')) {
      results.push({ url: t.props.href, tag: t.tag, identifier: t.props.rel || 'link', tagDedupeKey: dedupeKey })
    }
    // Link tags with relative/local image URLs (icons, apple-touch-icon)
    else if (t.tag === 'link' && t.props?.href && !t.props.href.startsWith('http') && (ICON_RELS.has(t.props.rel || '') || IMAGE_EXT_RE.test(t.props.href))) {
      results.push({ url: t.props.href, tag: t.tag, identifier: t.props.rel || 'link', tagDedupeKey: dedupeKey })
    }

    // Script tags with src
    if (t.tag === 'script' && t.props?.src?.startsWith('http')) {
      results.push({ url: t.props.src, tag: t.tag, identifier: 'src', tagDedupeKey: dedupeKey })
    }
  }

  return results
}

type CheckResult = 'ok' | 'broken' | 'unknown'

async function checkUrl(rawUrl: string, identifier: string): Promise<CheckResult> {
  // Skip during SSR/prerender: `new Image()` and relative `fetch` both fail there
  if (typeof window === 'undefined')
    return 'unknown'

  const url = resolvePageUrl(rawUrl)

  // Image() loads cross-origin images without CORS, so it gives a real answer.
  if (IMAGE_URL_META.has(identifier) || ICON_RELS.has(identifier) || IMAGE_EXT_RE.test(url)) {
    return new Promise<CheckResult>((resolve) => {
      const img = new Image()
      img.onload = () => resolve('ok')
      img.onerror = () => resolve('broken')
      img.src = url
    })
  }

  // A cross-origin HEAD fails CORS on most hosts and logs an error, so only
  // same-origin URLs get a status check.
  if (new URL(url).origin !== location.origin)
    return 'unknown'
  const res = await fetch(url, { method: 'HEAD' })
  // Many servers reject HEAD with 403 or 405; only treat a missing resource or a server error as broken.
  return res.status === 404 || res.status === 410 || res.status >= 500 ? 'broken' : 'ok'
}

export function validateLinks(tags: SerializedTag[]) {
  // Checks are keyed by the resolved target: after a navigation, the same
  // relative href can point at a different file.
  const urls = extractCheckableUrls(tags).map(u => ({ ...u, target: resolvePageUrl(u.url) }))
  const activeUrls = new Set(urls.map(u => u.url))
  const activeTargets = new Set(urls.map(u => u.target))

  // Forget check times for targets that left the page, so one that returns is checked again
  for (const target of checkedAt.keys()) {
    if (!activeTargets.has(target))
      checkedAt.delete(target)
  }

  // Prune stale broken-link entries for URLs that no longer exist in the tag set
  let pruned = false
  for (const url of brokenLinks.value.keys()) {
    if (!activeUrls.has(url)) {
      brokenLinks.value.delete(url)
      pruned = true
    }
  }
  if (pruned)
    triggerBrokenLinks()

  const now = Date.now()
  for (const { url, target, tag, identifier, tagDedupeKey } of urls) {
    if (pendingUrls.value.has(target) || now - (checkedAt.get(target) ?? 0) < RECHECK_MS)
      continue
    checkedAt.set(target, now)
    pendingUrls.value.add(target)
    triggerPending()

    checkUrl(url, identifier)
      .catch((err) => {
        console.warn('[unhead devtools] link check failed:', url, err)
        return 'unknown' as const
      })
      .then((result) => {
        pendingUrls.value.delete(target)
        triggerPending()
        if (result === 'broken') {
          brokenLinks.value.set(url, { url, tag, identifier, tagDedupeKey })
          triggerBrokenLinks()
        }
        // Recovered or unverifiable: drop any stale broken-link entry so the UI updates
        else if (brokenLinks.value.has(url)) {
          brokenLinks.value.delete(url)
          triggerBrokenLinks()
        }
      })
  }
}

/** Reset all state (useful when tags change significantly) */
export function resetLinkChecker() {
  brokenLinks.value = new Map()
  pendingUrls.value = new Set()
  checkedAt.clear()
}
