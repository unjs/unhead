import type { HeadTag, Unhead } from '../types'
import type { Diagnostic, RulesConfig, RuleSeverity, ValidationRuleId, ValidationRuleOptions } from '../validate'
import {
  headInputPredicates,
  tagInputFromRuntime,
  tagPredicates,
  titleInputFromRuntime,
  URL_META_KEYS,
} from '../validate'
import { defineHeadPlugin } from './defineHeadPlugin'

export type {
  RuleConfig,
  RulesConfig,
  RuleSeverity,
  ValidationRuleId,
  ValidationRuleOptions,
} from '../validate'

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

const TEMPLATE_PARAM_RE = /%\w+(?:\.\w+)?%/
const AT_PREFIX_RE = /^at\s+/

/**
 * Per-rule severity used by the runtime ValidatePlugin path that runs through
 * shared predicates. ValidatePlugin historically classifies a few rules as
 * `'info'` (lower-noise dev hints) while the source-level eslint-plugin and
 * CLI treat them as `'warn'` — that legacy split is preserved here. Every
 * predicate-emitted ruleId is listed explicitly so a new predicate's default
 * is a deliberate decision, not a `'warn'` fall-through.
 */
const PREDICATE_SEVERITY: Record<string, 'warn' | 'info'> = {
  'defer-on-module-script': 'info',
  'deprecated-prop-body': 'warn',
  'deprecated-prop-children': 'warn',
  'deprecated-prop-hid-vmid': 'warn',
  'empty-meta-content': 'warn',
  'html-in-title': 'warn',
  'non-absolute-canonical': 'warn',
  'numeric-tag-priority': 'info',
  'possible-typo': 'warn',
  'preload-font-crossorigin': 'warn',
  'preload-missing-as': 'warn',
  'robots-conflict': 'warn',
  'script-src-with-content': 'warn',
  'twitter-handle-missing-at': 'warn',
  'viewport-user-scalable': 'info',
}

function isAbsoluteUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

function extractOrigin(url: string): string | undefined {
  if (!isAbsoluteUrl(url))
    return undefined
  const slash = url.indexOf('/', url.indexOf('//') + 2)
  return slash === -1 ? url : url.slice(0, slash)
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
      if ((opts as any)?.mode && resolveSeverity(ruleConfig['deprecated-option-mode'] as RuleSeverity | [RuleSeverity, unknown] | undefined, 'warn') !== 'off') {
        console.warn(`[unhead] "mode: '${(opts as any).mode}'" option was removed in v3. Use the appropriate createHead import (unhead/client or unhead/server) instead.`)
      }
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
              // HTML `meta[name]` is case-insensitive; normalize for cross-tag lookups.
              const key = tag.props.property || (tag.props.name ? String(tag.props.name).toLowerCase() : undefined)
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

          // Predicate dispatch: per-tag rules whose logic is shared with the
          // source-level eslint-plugin / CLI. Adapt each runtime tag into a
          // predicate-friendly TagInput, run every predicate, and translate
          // each Diagnostic back into a `report()` call. Cross-tag and
          // runtime-only checks (URL_META_KEYS, render-blocking, content size,
          // template-param interpolation) stay inline below.
          function emitFromPredicates(diagnostics: Diagnostic[], tag: HeadTag) {
            for (const diag of diagnostics) {
              const sev = PREDICATE_SEVERITY[diag.ruleId] ?? 'warn'
              report(diag.ruleId as ValidationRuleId, diag.message, sev, tag)
            }
          }

          // Per-tag validation
          for (const tag of tags) {
            const { props } = tag
            const metaKey = props.property || (props.name ? String(props.name).toLowerCase() : undefined)

            // Shared predicates (covers: empty-meta-content, robots-conflict,
            // viewport-user-scalable, twitter-handle-missing-at, possible-typo,
            // non-absolute-canonical, preload-missing-as, preload-font-crossorigin,
            // script-src-with-content, defer-on-module-script,
            // deprecated-prop-* via no-deprecated-props).
            const tagInput = tagInputFromRuntime(tag)
            if (tagInput) {
              for (const predicate of Object.values(tagPredicates))
                emitFromPredicates(predicate(tagInput), tag)
            }

            // === URL Validity (runtime-only: depends on URL_META_KEYS lookup) ===

            // OG/Twitter URL meta
            if (tag.tag === 'meta' && metaKey && URL_META_KEYS.has(metaKey)) {
              const content = String(props.content ?? '')
              if (content && !isAbsoluteUrl(content))
                report('non-absolute-og-url', `${metaKey} should be an absolute URL, received "${content}".`, 'warn', tag)
            }

            // === Template-param interpolation (runtime-only: needs resolved string) ===

            if (tag.tag === 'meta' && metaKey) {
              const content = String(props.content ?? '')
              if (content && TEMPLATE_PARAM_RE.test(content))
                report('unresolved-template-param', `Unresolved template param in ${metaKey}: "${content}".`, 'warn', tag)
            }

            // Title checks. `html-in-title` is shared via the HeadInputPredicate
            // path; `unresolved-template-param` and `empty-title` are
            // runtime-only (need the resolved text) so stay inline.
            if (tag.tag === 'title') {
              const titleInput = titleInputFromRuntime(tag)
              if (titleInput) {
                for (const diag of headInputPredicates['no-html-in-title'](titleInput))
                  report(diag.ruleId as ValidationRuleId, diag.message, 'warn', tag)
              }
              const text = tag.textContent || ''
              if (TEMPLATE_PARAM_RE.test(text))
                report('unresolved-template-param', `Unresolved template param in title: "${text}".`, 'warn', tag)
              if (!text.trim())
                report('empty-title', `Title tag is empty. If using titleTemplate, ensure it produces output.`, 'warn', tag)
            }

            // === Render-blocking script (runtime-only: needs tagPosition) ===

            // Render-blocking script in head without async/defer/module
            if (tag.tag === 'script' && props.src && !props.async && !props.defer && props.type !== 'module' && (!tag.tagPosition || tag.tagPosition === 'head'))
              report('render-blocking-script', `Script "${props.src}" is render-blocking. Add "async", "defer", or use type="module" to avoid blocking the critical rendering path.`, 'warn', tag)

            // === Performance Hints ===
            // Inspired by webperf-snippets (https://webperf-snippets.nucliweb.net/)

            // Preload + fetchpriority="low" without a matching low-priority script is contradictory
            // Note: preload + fetchpriority="low" is a valid warmup pattern (used by useScript)
            // to hint the browser to start fetching early at low priority
            if (tag.tag === 'link' && props.rel === 'preload' && props.fetchpriority === 'low' && props.as !== 'script')
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
            report('canonical-og-url-mismatch', `Canonical URL "${canonicalHref}" differs from og:url "${ogUrl.props.content}".`, 'warn', ogUrl)

          // og:image without dimensions
          if (metaByKey.has('og:image') && (!metaByKey.has('og:image:width') || !metaByKey.has('og:image:height')))
            report('og-image-missing-dimensions', `og:image is set but og:image:width and/or og:image:height are missing — social platforms may not display the image.`, 'warn', metaByKey.get('og:image'))

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
          // Skip when the preload has fetchpriority="low" as this is a valid warmup pattern (used by useScript)
          const preloadScriptHrefs = new Map<string, HeadTag>()
          for (const tag of tags) {
            if (tag.tag === 'link' && tag.props.rel === 'preload' && tag.props.as === 'script' && tag.props.href && tag.props.fetchpriority !== 'low')
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
            const tpTag = tags.find((t: HeadTag) => t.tag === 'templateParams')
            if (tpTag)
              report('missing-template-params-plugin', `templateParams are set but TemplateParamsPlugin is not registered. In v3, this plugin is opt-in. Add it to createHead({ plugins: [TemplateParamsPlugin] }).`, 'warn', tpTag)
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

          // `no-deprecated-props` and `numeric-tag-priority` are dispatched
          // through the per-tag shared-predicate path above (the runtime
          // adapter surfaces `tag.tagPriority` as `props.tagPriority` so the
          // predicate fires on resolved tags).

          // Too many fetchpriority="high" dilutes the signal
          const { max: maxHighPriority } = resolveOptions(ruleConfig, 'too-many-fetchpriority-high', { max: 2 })
          const highPriorityCount = tags.filter((t: HeadTag) => t.props.fetchpriority === 'high').length
          if (highPriorityCount > maxHighPriority)
            report('too-many-fetchpriority-high', `Found ${highPriorityCount} resources with fetchpriority="high". When everything is high priority, nothing is. Limit to ${maxHighPriority} for the signal to be effective.`, 'warn')

          // Duplicate resource hints (same href in multiple preload/preconnect/prefetch)
          const resourceHintsSeen = new Map<string, HeadTag>()
          for (const tag of tags) {
            if (tag.tag === 'link' && tag.props.href && (tag.props.rel === 'preload' || tag.props.rel === 'prefetch' || tag.props.rel === 'preconnect')) {
              const crossoriginSuffix = tag.props.rel === 'preconnect' && 'crossorigin' in tag.props ? ':cors' : ''
              const key = `${tag.props.rel}:${tag.props.href}${crossoriginSuffix}`
              if (resourceHintsSeen.has(key))
                report('duplicate-resource-hint', `Duplicate ${tag.props.rel} for "${tag.props.href}".`, 'warn', tag)
              else
                resourceHintsSeen.set(key, tag)
            }
          }

          // charset meta should appear early in head
          // Only check on SSR where we control the render order; on the client the DOM order
          // is already set by SSR and capo weights ensure charset is placed early.
          if (head.ssr) {
            const { maxPosition: charsetMaxPos } = resolveOptions(ruleConfig, 'charset-not-early', { maxPosition: 3 })
            const headElementTags = new Set(['title', 'base', 'meta', 'link', 'style', 'script', 'noscript'])
            const sortedHeadTags = tags
              .filter((t: any) => headElementTags.has(t.tag) && (!t.tagPosition || t.tagPosition === 'head'))
              .sort((a: any, b: any) => (a._w ?? 100) === (b._w ?? 100) ? (a._p ?? 0) - (b._p ?? 0) : (a._w ?? 100) - (b._w ?? 100))
            let charsetTag: HeadTag | undefined
            let charsetPosition = -1
            for (let i = 0; i < sortedHeadTags.length; i++) {
              const tag = sortedHeadTags[i]
              if (tag.tag === 'meta' && ('charset' in tag.props || tag.props['http-equiv']?.toLowerCase() === 'content-type')) {
                charsetTag = tag
                charsetPosition = i + 1
                break
              }
            }
            if (charsetTag && charsetPosition > charsetMaxPos)
              report('charset-not-early', `<meta charset> is at position ${charsetPosition} in <head>. It should be within the first ${charsetMaxPos} tags so the browser doesn't need to re-parse.`, 'warn', charsetTag)
          }

          // preload as="script" when the actual script is type="module" should use modulepreload
          const moduleScriptSrcs = new Set<string>()
          for (const tag of tags) {
            if (tag.tag === 'script' && tag.props.type === 'module' && tag.props.src)
              moduleScriptSrcs.add(tag.props.src)
          }
          for (const tag of tags) {
            if (tag.tag === 'link' && tag.props.rel === 'preload' && tag.props.as === 'script' && tag.props.href && moduleScriptSrcs.has(tag.props.href))
              report('preload-not-modulepreload', `"${tag.props.href}" is a module script but uses rel="preload". Use rel="modulepreload" instead to also trigger module parsing.`, 'warn', tag)
          }

          // Preconnect missing crossorigin for origins that serve CORS resources
          const corsOrigins = new Set<string>()
          const preconnectCorsOrigins = new Set<string>()
          for (const tag of tags) {
            if (tag.tag === 'link' && tag.props.href && 'crossorigin' in tag.props) {
              const origin = extractOrigin(tag.props.href)
              if (origin) {
                corsOrigins.add(origin)
                if (tag.props.rel === 'preconnect')
                  preconnectCorsOrigins.add(origin)
              }
            }
          }
          for (const tag of tags) {
            if (tag.tag === 'link' && tag.props.rel === 'preconnect' && tag.props.href && !('crossorigin' in tag.props)) {
              const origin = extractOrigin(tag.props.href)
              // Skip if a CORS preconnect already exists for this origin (intentional dual connection pool)
              if (origin && corsOrigins.has(origin) && !preconnectCorsOrigins.has(origin))
                report('preconnect-missing-crossorigin', `Preconnect to "${tag.props.href}" is missing "crossorigin" but CORS resources are loaded from this origin. Without it, the browser opens a separate connection for CORS requests.`, 'warn', tag)
            }
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

          // Store rules on the head instance for devtools integration
          ;(head as any)._validationRules = rules

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
