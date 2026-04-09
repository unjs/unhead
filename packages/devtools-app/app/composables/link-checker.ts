import type { SerializedTag } from './state'

export interface BrokenLink {
  url: string
  tag: string
  identifier: string
  status: number | 'error'
  tagDedupeKey?: string
}

const IMAGE_URL_META = new Set(['og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image', 'twitter:image:src'])
const URL_META = new Set([...IMAGE_URL_META, 'og:url', 'og:video', 'og:video:url', 'og:audio', 'og:audio:url'])
const ICON_RELS = new Set(['icon', 'apple-touch-icon', 'apple-touch-icon-precomposed'])
const IMAGE_EXT_RE = /\.(?:png|jpe?g|gif|svg|ico|webp|avif)(?:\?.*)?$/i

/** All broken link results keyed by URL */
export const brokenLinks = shallowRef(new Map<string, BrokenLink>())
/** URLs currently being checked */
export const pendingUrls = shallowRef(new Set<string>())
/** All URLs that have been checked (including successful ones) */
const checkedUrls = new Set<string>()

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

async function checkUrl(url: string, identifier: string): Promise<number | 'error'> {
  // For image URLs (including relative icon paths), use Image() which reliably detects broken images
  if (IMAGE_URL_META.has(identifier) || ICON_RELS.has(identifier) || IMAGE_EXT_RE.test(url)) {
    return new Promise<number>((resolve) => {
      const img = new Image()
      img.onload = () => resolve(200)
      img.onerror = () => resolve(0)
      img.src = url
    })
  }
  // For non-image URLs, try fetch with cors first, fall back to no-cors
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.status
  }
  catch {
    // CORS blocked, can't determine status so assume OK
    return 200
  }
}

export function validateLinks(tags: SerializedTag[]) {
  const urls = extractCheckableUrls(tags)

  for (const { url, tag, identifier, tagDedupeKey } of urls) {
    if (checkedUrls.has(url))
      continue
    checkedUrls.add(url)
    pendingUrls.value.add(url)
    triggerPending()

    checkUrl(url, identifier).then((status) => {
      pendingUrls.value.delete(url)
      triggerPending()
      // 200 = loaded fine, skip. 0 = image failed to load
      if (status === 'error' || status === 0 || (status >= 400 && status < 600)) {
        brokenLinks.value.set(url, { url, tag, identifier, status, tagDedupeKey })
        triggerBrokenLinks()
      }
    })
  }
}

/** Reset all state (useful when tags change significantly) */
export function resetLinkChecker() {
  brokenLinks.value = new Map()
  pendingUrls.value = new Set()
  checkedUrls.clear()
}
