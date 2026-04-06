import type { HeadTag, Unhead } from '../types'
import { defineHeadPlugin } from './defineHeadPlugin'

export type RuleSeverity = 'warn' | 'info' | 'off'

export type ValidationRuleId
  = | 'canonical-og-url-mismatch'
    | 'deprecated-prop-body'
    | 'deprecated-prop-children'
    | 'deprecated-prop-hid-vmid'
    | 'empty-meta-content'
    | 'empty-title'
    | 'html-in-title'
    | 'inline-script-size'
    | 'inline-style-size'
    | 'meta-beyond-1mb'
    | 'missing-alias-sorting-plugin'
    | 'missing-description'
    | 'missing-template-params-plugin'
    | 'missing-title'
    | 'non-absolute-canonical'
    | 'non-absolute-og-url'
    | 'og-image-missing-dimensions'
    | 'og-missing-description'
    | 'og-missing-title'
    | 'possible-typo'
    | 'prefetch-preload-conflict'
    | 'preload-async-defer-conflict'
    | 'preload-fetchpriority-conflict'
    | 'preload-font-crossorigin'
    | 'preload-missing-as'
    | 'redundant-dns-prefetch'
    | 'robots-conflict'
    | 'script-src-with-content'
    | 'too-many-preconnects'
    | 'too-many-preloads'
    | 'twitter-handle-missing-at'
    | 'unresolved-template-param'
    | 'viewport-user-scalable'

export interface ValidationRuleOptions {
  'inline-script-size': { maxKB: number }
  'inline-style-size': { maxKB: number }
  'meta-beyond-1mb': { maxBytes: number }
  'too-many-preloads': { max: number }
  'too-many-preconnects': { max: number }
}

export type RuleConfig<Id extends ValidationRuleId> = Id extends keyof ValidationRuleOptions
  ? RuleSeverity | [severity: RuleSeverity, options: ValidationRuleOptions[Id]]
  : RuleSeverity

export type RulesConfig = { [K in ValidationRuleId]?: RuleConfig<K> }

export interface HeadValidationRule {
  id: ValidationRuleId
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
   * Configure rule severity and options. Accepts a severity string or an ESLint-style
   * `[severity, options]` tuple for rules that support configuration.
   *
   * @example
   * ```ts
   * rules: {
   *   'missing-description': 'off',
   *   'too-many-preloads': ['warn', { max: 10 }],
   *   'inline-style-size': ['info', { maxKB: 20 }],
   * }
   * ```
   */
  rules?: RulesConfig
  /**
   * Project root path. When set, source locations are displayed as relative paths.
   */
  root?: string
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
  'book:release_date',
  'book:tag',
  'fb:app_id',
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
  'og:site_name',
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
  'fediverse:creator',
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
const MAX_SCALE_RE = /maximum-scale\s*=\s*1(?:\.0?)?(?:\s|,|$)/i
const USER_SCALABLE_NO_RE = /user-scalable\s*=\s*no(?:\s|,|$)/i
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

function resolveSeverity(config: RuleSeverity | [RuleSeverity, unknown] | undefined, fallback: RuleSeverity): RuleSeverity {
  if (config == null)
    return fallback
  return Array.isArray(config) ? config[0] : config
}

function resolveOptions<Id extends keyof ValidationRuleOptions>(
  config: RulesConfig,
  id: Id,
  defaults: ValidationRuleOptions[Id],
): ValidationRuleOptions[Id] {
  const entry = config[id]
  if (Array.isArray(entry))
    return { ...defaults, ...entry[1] }
  return defaults
}

function captureSource(root?: string): string | undefined {
  const stack = new Error('source').stack
  if (!stack)
    return undefined
  const lines = stack.split('\n')
  for (let i = 4; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line && !line.includes('node_modules') && !line.includes('unhead/src/')) {
      let source = line.replace(AT_PREFIX_RE, '')
      if (root) {
        const prefix = root.endsWith('/') ? root : `${root}/`
        source = source.replace(prefix, './')
      }
      return source
    }
  }
  return undefined
}

export function ValidatePlugin(options: ValidatePluginOptions = {}) {
  const ruleConfig = options.rules || {}
  const root = options.root
  const stacks = new Map<number, string>()

  return defineHeadPlugin((head: Unhead) => {
    const _push = head.push.bind(head)
    head.push = (input, opts) => {
      const source = captureSource(root)
      const active = _push(input, opts)
      if (source)
        stacks.set(active._i, source)
      const _dispose = active.dispose
      active.dispose = () => {
        stacks.delete(active._i)
        _dispose()
      }
      return active
    }

    return {
      key: 'validate',
      hooks: {
        'tags:afterResolve': ({ tags }) => {
          const rules: HeadValidationRule[] = []

          function report(id: ValidationRuleId, message: string, defaultSeverity: 'warn' | 'info', tag?: HeadTag) {
            const severity = resolveSeverity(ruleConfig[id] as RuleSeverity | [RuleSeverity, unknown] | undefined, defaultSeverity)
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
                if (USER_SCALABLE_NO_RE.test(content))
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

              if (props.name && !KNOWN_META_NAMES.has(props.name) && (props.name.startsWith('twitter:') || props.name.startsWith('fediverse:') || !props.name.includes(':'))) {
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

            // === Performance Hints ===
            // Inspired by webperf-snippets (https://webperf-snippets.nucliweb.net/)

            // Preload + fetchpriority="low" is contradictory
            if (tag.tag === 'link' && props.rel === 'preload' && props.fetchpriority === 'low')
              report('preload-fetchpriority-conflict', `Preload with fetchpriority="low" is contradictory — preload signals critical, low priority contradicts that.`, 'warn', tag)

            // Inline style size check (14KB critical CSS budget)
            if (tag.tag === 'style' && (tag.innerHTML || tag.textContent)) {
              const content = tag.innerHTML || tag.textContent || ''
              const sizeKB = new TextEncoder().encode(content).byteLength / 1024
              const { maxKB: styleMaxKB } = resolveOptions(ruleConfig, 'inline-style-size', { maxKB: 14 })
              if (sizeKB > styleMaxKB)
                report('inline-style-size', `Inline <style> is ${sizeKB.toFixed(1)}KB — exceeds ${styleMaxKB}KB critical CSS budget. Consider moving to an external stylesheet for cacheability.`, 'info', tag)
            }

            // Inline script size check (2KB threshold)
            if (tag.tag === 'script' && !props.src && (tag.innerHTML || tag.textContent)) {
              const content = tag.innerHTML || tag.textContent || ''
              const sizeKB = new TextEncoder().encode(content).byteLength / 1024
              const { maxKB: scriptMaxKB } = resolveOptions(ruleConfig, 'inline-script-size', { maxKB: 2 })
              if (sizeKB > scriptMaxKB)
                report('inline-script-size', `Inline <script> is ${sizeKB.toFixed(1)}KB — consider moving to an external file for cacheability.`, 'info', tag)
            }
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

          // === Performance Cross-tag Checks ===
          // Inspired by webperf-snippets (https://webperf-snippets.nucliweb.net/)

          // Too many preloads compete for bandwidth
          const { max: maxPreloads } = resolveOptions(ruleConfig, 'too-many-preloads', { max: 6 })
          const preloadCount = tags.filter((t: HeadTag) => t.tag === 'link' && t.props.rel === 'preload').length
          if (preloadCount > maxPreloads)
            report('too-many-preloads', `Found ${preloadCount} preload links — more than ${maxPreloads} preloads compete for bandwidth and can hurt performance.`, 'warn')

          // Too many preconnects waste connections
          const { max: maxPreconnects } = resolveOptions(ruleConfig, 'too-many-preconnects', { max: 4 })
          const preconnectCount = tags.filter((t: HeadTag) => t.tag === 'link' && t.props.rel === 'preconnect').length
          if (preconnectCount > maxPreconnects)
            report('too-many-preconnects', `Found ${preconnectCount} preconnect links — each initiates a TCP+TLS handshake, more than ${maxPreconnects} compete for limited connections.`, 'warn')

          // Redundant dns-prefetch when preconnect exists for same origin
          const preconnectOrigins = new Set<string>()
          const dnsPrefetchTags: HeadTag[] = []
          for (const tag of tags) {
            if (tag.tag === 'link' && tag.props.href) {
              if (tag.props.rel === 'preconnect')
                preconnectOrigins.add(tag.props.href)
              else if (tag.props.rel === 'dns-prefetch')
                dnsPrefetchTags.push(tag)
            }
          }
          for (const tag of dnsPrefetchTags) {
            if (preconnectOrigins.has(tag.props.href))
              report('redundant-dns-prefetch', `dns-prefetch for "${tag.props.href}" is redundant — preconnect already includes DNS resolution.`, 'info', tag)
          }

          // Preload + async/defer script conflict (priority escalation anti-pattern)
          const preloadScriptHrefs = new Map<string, HeadTag>()
          for (const tag of tags) {
            if (tag.tag === 'link' && tag.props.rel === 'preload' && tag.props.as === 'script' && tag.props.href)
              preloadScriptHrefs.set(tag.props.href, tag)
          }
          for (const tag of tags) {
            if (tag.tag === 'script' && tag.props.src && (tag.props.async || tag.props.defer)) {
              const preloadTag = preloadScriptHrefs.get(tag.props.src)
              if (preloadTag) {
                const attr = tag.props.async ? 'async' : 'defer'
                report('preload-async-defer-conflict', `Script "${tag.props.src}" is preloaded but has "${attr}" — preload escalates priority, defeating the purpose of ${attr}. Remove the preload or add fetchpriority="low" to the script.`, 'warn', preloadTag)
              }
            }
          }

          // Prefetch + preload conflict (should be one or the other)
          const preloadHrefs = new Set<string>()
          for (const tag of tags) {
            if (tag.tag === 'link' && tag.props.rel === 'preload' && tag.props.href)
              preloadHrefs.add(tag.props.href)
          }
          for (const tag of tags) {
            if (tag.tag === 'link' && tag.props.rel === 'prefetch' && tag.props.href && preloadHrefs.has(tag.props.href))
              report('prefetch-preload-conflict', `"${tag.props.href}" has both preload and prefetch — use preload for current page resources, prefetch for future navigation.`, 'warn', tag)
          }

          // === v2 → v3 Migration Checks ===

          // Missing TemplateParamsPlugin (silent breakage — %params appear literally)
          if (!head.plugins.has('template-params')) {
            if (tags.some((t: HeadTag) => t.tag === 'templateParams'))
              report('missing-template-params-plugin', `templateParams are set but TemplateParamsPlugin is not registered. In v3, this plugin is opt-in. Add it to createHead({ plugins: [TemplateParamsPlugin] }).`, 'warn')
          }

          // Missing AliasSortingPlugin (silent breakage — before:/after: priorities ignored)
          if (!head.plugins.has('aliasSorting')) {
            for (const tag of tags) {
              const p = typeof tag.tagPriority === 'string' ? tag.tagPriority : ''
              if (p.startsWith('before:') || p.startsWith('after:')) {
                report('missing-alias-sorting-plugin', `Tag priority alias "${p}" requires AliasSortingPlugin. In v3, this plugin is opt-in. Add it to createHead({ plugins: [AliasSortingPlugin] }).`, 'warn', tag)
                break
              }
            }
          }

          // Deprecated v2 property names (no longer auto-converted)
          for (const tag of tags) {
            if ('children' in tag.props)
              report('deprecated-prop-children', `"children" was removed in v3. Use "innerHTML" instead.`, 'warn', tag)
            if ('hid' in tag.props || 'vmid' in tag.props)
              report('deprecated-prop-hid-vmid', `"${('hid' in tag.props) ? 'hid' : 'vmid'}" was removed in v3. Use "key" instead.`, 'warn', tag)
            if (tag.props.body === true)
              report('deprecated-prop-body', `"body: true" was removed in v3. Use "tagPosition: 'bodyClose'" instead.`, 'warn', tag)
          }

          // Meta tags rendered after the crawler byte limit (default 1MB)
          // Social crawlers (Facebook, Twitter) only parse the first ~1MB of HTML.
          // Large inline styles can push SEO/OG meta tags past this limit.
          const { maxBytes: crawlerMaxBytes } = resolveOptions(ruleConfig, 'meta-beyond-1mb', { maxBytes: 1_048_576 })
          let byteOffset = 0
          for (const tag of tags) {
            if (tag.tagPosition && tag.tagPosition !== 'head')
              continue
            // Estimate rendered tag size
            const props = Object.entries(tag.props)
              .filter(([, v]) => v !== false && v != null)
              .map(([k, v]) => v === true || v === '' ? ` ${k}` : ` ${k}="${v}"`)
              .join('')
            const content = tag.innerHTML || tag.textContent || ''
            // <tag props>content</tag> + newline
            const tagSize = `<${tag.tag}${props}>${content}</${tag.tag}>\n`.length
            byteOffset += tagSize
            if (byteOffset > crawlerMaxBytes && tag.tag === 'meta') {
              const key = tag.props.property || tag.props.name || 'unknown'
              report(
                'meta-beyond-1mb',
                `Meta tag "${key}" is rendered ~${(byteOffset / 1024).toFixed(0)}KB into <head>, beyond the ${(crawlerMaxBytes / 1_048_576).toFixed(0)}MB crawler parsing limit. Social crawlers (Facebook, Twitter) may not see it. Use \`tagPriority\` to promote it, or configure a custom \`tagWeight\` to reorder tags for bot requests.`,
                'warn',
                tag,
              )
            }
          }

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
