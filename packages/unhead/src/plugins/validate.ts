import type { HeadTag, Unhead } from '../types'
import { defineHeadPlugin } from './defineHeadPlugin'

export type RuleSeverity = 'warn' | 'info' | 'off'

export interface HeadValidationRule {
  id: string
  message: string
  severity: 'warn' | 'info'
  source?: string
  tag?: HeadTag
}

export interface ValidatePluginOptions {
  /**
   * Callback to handle validation results. Receives all rules found per resolve cycle.
   * Defaults to `console.warn` for each rule.
   */
  onReport?: (rules: HeadValidationRule[]) => void
  /**
   * Configure rule severity. Set to 'off' to disable, or 'warn'/'info' to override severity.
   */
  rules?: Partial<Record<string, RuleSeverity>>
}

const URL_META_KEYS = new Set([
  'og:url',
  'og:image',
  'og:image:url',
  'og:image:secure_url',
  'og:video',
  'og:video:url',
  'og:video:secure_url',
  'og:audio',
  'og:audio:url',
  'og:audio:secure_url',
  'twitter:image',
  'twitter:image:src',
  'twitter:player',
  'twitter:player:stream',
])

const KNOWN_META_PROPERTIES = new Set([
  'article:author',
  'article:expiration_time',
  'article:modified_time',
  'article:published_time',
  'article:section',
  'article:tag',
  'book:author',
  'book:isbn',
  'book:release_data',
  'book:tag',
  'fb:app:id',
  'og:audio',
  'og:audio:secure_url',
  'og:audio:type',
  'og:audio:url',
  'og:description',
  'og:determiner',
  'og:image',
  'og:image:height',
  'og:image:secure_url',
  'og:image:type',
  'og:image:url',
  'og:image:width',
  'og:locale',
  'og:locale:alternate',
  'og:site:name',
  'og:title',
  'og:type',
  'og:url',
  'og:video',
  'og:video:height',
  'og:video:secure_url',
  'og:video:type',
  'og:video:url',
  'og:video:width',
  'profile:first_name',
  'profile:gender',
  'profile:last_name',
  'profile:username',
])

const KNOWN_META_NAMES = new Set([
  'apple-itunes-app',
  'apple-mobile-web-app-capable',
  'apple-mobile-web-app-status-bar-style',
  'apple-mobile-web-app-title',
  'application-name',
  'author',
  'color-scheme',
  'creator',
  'description',
  'fb:app_id',
  'format-detection',
  'generator',
  'google-site-verification',
  'google',
  'googlebot',
  'keywords',
  'mobile-web-app-capable',
  'msapplication-Config',
  'msapplication-TileColor',
  'msapplication-TileImage',
  'publisher',
  'rating',
  'referrer',
  'robots',
  'theme-color',
  'viewport',
  'twitter:app:id:googleplay',
  'twitter:app:id:ipad',
  'twitter:app:id:iphone',
  'twitter:app:name:googleplay',
  'twitter:app:name:ipad',
  'twitter:app:name:iphone',
  'twitter:app:url:googleplay',
  'twitter:app:url:ipad',
  'twitter:app:url:iphone',
  'twitter:card',
  'twitter:creator',
  'twitter:creator:id',
  'twitter:data:1',
  'twitter:data:2',
  'twitter:description',
  'twitter:image',
  'twitter:image:alt',
  'twitter:label:1',
  'twitter:label:2',
  'twitter:player',
  'twitter:player:height',
  'twitter:player:stream',
  'twitter:player:width',
  'twitter:site',
  'twitter:site:id',
  'twitter:title',
])

const TEMPLATE_PARAM_RE = /%\w+(?:\.\w+)?%/
const MAX_SCALE_RE = /maximum-scale\s*=\s*1(?:\.0?)?(?:\s|,|$)/
const NUMERIC_RE = /^\d+$/
const OG_PREFIX_RE = /^(?:og|article|book|profile|fb):/
const HTML_CHARS_RE = /[<>]/
const AT_PREFIX_RE = /^at\s+/

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const d: number[] = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = i - 1
    d[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = d[j]
      d[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, d[j], d[j - 1])
      prev = tmp
    }
  }
  return d[n]
}

function findClosestMatch(value: string, knownSet: Set<string>): string | undefined {
  const threshold = value.length <= 8 ? 2 : 3
  let best: string | undefined
  let bestDist = threshold + 1
  for (const known of knownSet) {
    if (Math.abs(known.length - value.length) > threshold)
      continue
    const dist = levenshtein(value, known)
    if (dist < bestDist) {
      bestDist = dist
      best = known
    }
  }
  return best
}

function isAbsoluteUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

function captureSource(): string | undefined {
  const stack = new Error('source').stack
  if (!stack)
    return undefined
  // skip Error, captureSource, report, plugin hook frames — find the first user frame
  const lines = stack.split('\n')
  for (let i = 4; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line && !line.includes('node_modules') && !line.includes('unhead/src/'))
      return line.replace(AT_PREFIX_RE, '')
  }
  return undefined
}

export function ValidatePlugin(options: ValidatePluginOptions = {}) {
  const ruleConfig = options.rules || {}
  const stacks = new Map<number, string>()

  return defineHeadPlugin((head: Unhead) => {
    const _push = head.push.bind(head)
    head.push = (input, opts) => {
      const source = captureSource()
      const active = _push(input, opts)
      if (source)
        stacks.set(active._i, source)
      return active
    }

    return {
      key: 'validate',
      hooks: {
        'tags:afterResolve': ({ tags }) => {
          const rules: HeadValidationRule[] = []

          function report(id: string, message: string, defaultSeverity: 'warn' | 'info', tag?: HeadTag) {
            const severity = ruleConfig[id] ?? defaultSeverity
            if (severity === 'off')
              return
            const entryIndex = tag?._p != null ? tag._p >> 10 : undefined
            const source = entryIndex != null ? stacks.get(entryIndex) : undefined
            rules.push({ id, message, severity, source, tag })
          }

          // Build lookup maps for cross-tag checks
          const metaByKey = new Map<string, HeadTag>()
          let canonicalHref: string | undefined
          let hasOgTags = false
          let hasTitle = false
          let hasDescription = false
          let isIndexable = true

          for (const tag of tags) {
            if (tag.tag === 'title')
              hasTitle = true

            if (tag.tag === 'meta') {
              const key = tag.props.property || tag.props.name
              if (key) {
                metaByKey.set(key, tag)
                if (key.startsWith('og:'))
                  hasOgTags = true
                if (key === 'description')
                  hasDescription = true
                if (key === 'robots' && tag.props.content?.toLowerCase().includes('noindex'))
                  isIndexable = false
              }
            }

            if (tag.tag === 'link' && tag.props.rel === 'canonical')
              canonicalHref = tag.props.href
          }

          // Per-tag validation
          for (const tag of tags) {
            const { props } = tag
            const metaKey = props.property || props.name

            // === URL Validity ===

            // Canonical
            if (tag.tag === 'link' && props.rel === 'canonical' && props.href) {
              if (!isAbsoluteUrl(props.href))
                report('non-absolute-canonical', `Canonical URL should be absolute, received "${props.href}".`, 'warn', tag)
            }

            // OG/Twitter URL meta
            if (tag.tag === 'meta' && metaKey && URL_META_KEYS.has(metaKey)) {
              const content = String(props.content ?? '')
              if (content && !isAbsoluteUrl(content))
                report('non-absolute-og-url', `${metaKey} should be an absolute URL, received "${content}".`, 'warn', tag)
            }

            // === Content Quality ===

            if (tag.tag === 'meta' && metaKey) {
              const content = String(props.content ?? '')

              // Empty content
              if ('content' in props && content === '')
                report('empty-meta-content', `Meta tag "${metaKey}" has empty content.`, 'warn', tag)

              // Unresolved template params in meta content
              if (content && TEMPLATE_PARAM_RE.test(content))
                report('unresolved-template-param', `Unresolved template param in ${metaKey}: "${content}".`, 'warn', tag)

              // === Conflict Detection ===

              // Robots conflicts
              if (metaKey === 'robots' && content) {
                const directives = content.toLowerCase().split(',').map((d: string) => d.trim())
                if (directives.includes('index') && directives.includes('noindex'))
                  report('robots-conflict', `Robots meta has conflicting "index" and "noindex" directives.`, 'warn', tag)
                if (directives.includes('follow') && directives.includes('nofollow'))
                  report('robots-conflict', `Robots meta has conflicting "follow" and "nofollow" directives.`, 'warn', tag)
              }

              // Viewport accessibility
              if (metaKey === 'viewport' && content) {
                if (content.includes('user-scalable=no'))
                  report('viewport-user-scalable', `viewport has "user-scalable=no" which prevents zooming and harms accessibility.`, 'info', tag)
                if (MAX_SCALE_RE.test(content))
                  report('viewport-user-scalable', `viewport "maximum-scale=1" limits zooming and may harm accessibility.`, 'info', tag)
              }

              // Twitter handle missing @
              if ((metaKey === 'twitter:site' || metaKey === 'twitter:creator') && content && !content.startsWith('@') && !NUMERIC_RE.test(content))
                report('twitter-handle-missing-at', `${metaKey} should start with "@", received "${content}".`, 'warn', tag)

              // === Typo Detection ===

              if (props.property && !KNOWN_META_PROPERTIES.has(props.property) && OG_PREFIX_RE.test(props.property)) {
                const suggestion = findClosestMatch(props.property, KNOWN_META_PROPERTIES)
                if (suggestion)
                  report('possible-typo', `Unknown meta property "${props.property}". Did you mean "${suggestion}"?`, 'warn', tag)
              }

              if (props.name && !KNOWN_META_NAMES.has(props.name) && (props.name.startsWith('twitter:') || !props.name.includes(':'))) {
                const suggestion = findClosestMatch(props.name, KNOWN_META_NAMES)
                if (suggestion)
                  report('possible-typo', `Unknown meta name "${props.name}". Did you mean "${suggestion}"?`, 'warn', tag)
              }
            }

            // Title checks
            if (tag.tag === 'title') {
              const text = tag.textContent || ''
              if (HTML_CHARS_RE.test(text))
                report('html-in-title', `Title contains HTML characters which will be escaped, not rendered: "${text}".`, 'warn', tag)
              if (TEMPLATE_PARAM_RE.test(text))
                report('unresolved-template-param', `Unresolved template param in title: "${text}".`, 'warn', tag)
              if (!text.trim())
                report('empty-title', `Title tag is empty. If using titleTemplate, ensure it produces output.`, 'warn', tag)
            }

            // === Preload / Script ===

            if (tag.tag === 'link' && props.rel === 'preload') {
              if (props.as === 'font' && !('crossorigin' in props))
                report('preload-font-crossorigin', `Font preload requires "crossorigin" attribute — without it the font will be fetched twice.`, 'warn', tag)
              if (!props.as)
                report('preload-missing-as', `Preload link is missing the required "as" attribute.`, 'warn', tag)
            }

            if (tag.tag === 'script' && props.src && (tag.innerHTML || tag.textContent))
              report('script-src-with-content', `Script has both "src" and inline content — the browser will ignore the inline content.`, 'warn', tag)
          }

          // === Cross-tag Validation ===

          // Canonical vs og:url mismatch
          const ogUrl = metaByKey.get('og:url')
          if (canonicalHref && ogUrl?.props.content && canonicalHref !== ogUrl.props.content)
            report('canonical-og-url-mismatch', `Canonical URL "${canonicalHref}" differs from og:url "${ogUrl.props.content}".`, 'warn')

          // og:image without dimensions
          if (metaByKey.has('og:image') && (!metaByKey.has('og:image:width') || !metaByKey.has('og:image:height')))
            report('og-image-missing-dimensions', `og:image is set but og:image:width and/or og:image:height are missing — social platforms may not display the image.`, 'warn')

          // OG tags without og:title or og:description
          if (hasOgTags) {
            if (!metaByKey.has('og:title'))
              report('og-missing-title', `Open Graph tags are present but og:title is missing.`, 'warn')
            if (!metaByKey.has('og:description'))
              report('og-missing-description', `Open Graph tags are present but og:description is missing.`, 'warn')
          }

          // Missing title (always warn)
          if (!hasTitle)
            report('missing-title', `Page is missing a <title> tag.`, 'warn')

          // Missing description (only when indexable)
          if (!hasDescription && isIndexable)
            report('missing-description', `Page is missing a meta description and is indexable by search engines.`, 'warn')

          // Dispatch
          if (rules.length) {
            if (options.onReport) {
              options.onReport(rules)
            }
            else {
              for (const rule of rules) {
                const loc = rule.source ? ` (${rule.source})` : ''
                console.warn(`[unhead] ${rule.message}${loc}`)
              }
            }
          }
        },
      },
    }
  })
}
