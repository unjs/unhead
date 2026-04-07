import type { HeadValidationRule, ValidatePluginOptions } from '../../../src/plugins'
import { renderSSRHead } from '@unhead/ssr'
import { describe, expect, it, vi } from 'vitest'
import { AliasSortingPlugin, TemplateParamsPlugin, ValidatePlugin } from '../../../src/plugins'
import { createHead } from '../../../src/server'

function createValidationHead(opts?: Pick<ValidatePluginOptions, 'rules'>) {
  const results: HeadValidationRule[] = []
  const head = createHead({
    disableDefaults: true,
    plugins: [ValidatePlugin({
      onReport: r => results.push(...r),
      ...opts,
    })],
  })
  return { head, rules: results }
}

describe('validatePlugin', () => {
  describe('url validity', () => {
    it('warns on non-absolute canonical', () => {
      const { head, rules } = createValidationHead()
      head.push({ link: [{ rel: 'canonical', href: '/page' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'non-absolute-canonical')).toBeTruthy()
    })

    it('does not warn on absolute canonical', () => {
      const { head, rules } = createValidationHead()
      head.push({ link: [{ rel: 'canonical', href: 'https://example.com/page' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'non-absolute-canonical')).toBeFalsy()
    })

    it('warns on non-absolute og:image', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ property: 'og:image', content: '/image.jpg' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'non-absolute-og-url')).toBeTruthy()
    })

    it('warns on non-absolute og:url', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ property: 'og:url', content: '/page' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'non-absolute-og-url')).toBeTruthy()
    })

    it('warns on non-absolute twitter:image', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'twitter:image', content: '/img.png' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'non-absolute-og-url')).toBeTruthy()
    })

    it('does not warn on absolute og:image', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ property: 'og:image', content: 'https://example.com/image.jpg' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'non-absolute-og-url')).toBeFalsy()
    })

    it('warns when canonical differs from og:url', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [{ rel: 'canonical', href: 'https://example.com/a' }],
        meta: [{ property: 'og:url', content: 'https://example.com/b' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'canonical-og-url-mismatch')).toBeTruthy()
    })

    it('does not warn when canonical matches og:url', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [{ rel: 'canonical', href: 'https://example.com/a' }],
        meta: [{ property: 'og:url', content: 'https://example.com/a' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'canonical-og-url-mismatch')).toBeFalsy()
    })
  })

  describe('content quality', () => {
    it('warns on empty meta content', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'description', content: '' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'empty-meta-content')).toBeTruthy()
    })

    it('warns on HTML in title', () => {
      const { head, rules } = createValidationHead()
      head.push({ title: '<b>My Title</b>' })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'html-in-title')).toBeTruthy()
    })

    it('does not warn on normal title', () => {
      const { head, rules } = createValidationHead()
      head.push({ title: 'My Title' })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'html-in-title')).toBeFalsy()
    })

    it('warns on unresolved template params in title', () => {
      const { head, rules } = createValidationHead()
      // Push a title that will literally contain %siteName% after resolution
      head.push({
        title: '%siteName%',
        // intentionally no templateParams defined
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'unresolved-template-param')).toBeTruthy()
    })

    it('warns on unresolved template params in meta content', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'description', content: 'Welcome to %siteName%' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'unresolved-template-param')).toBeTruthy()
    })

    it('warns on empty title', () => {
      const { head, rules } = createValidationHead()
      head.push({ title: '' })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'empty-title')).toBeTruthy()
    })

    it('warns when no title tag exists', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'description', content: 'test' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'missing-title')).toBeTruthy()
    })

    it('warns when no description and page is indexable', () => {
      const { head, rules } = createValidationHead()
      head.push({ title: 'test' })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'missing-description')).toBeTruthy()
    })

    it('does not warn about missing description when noindex', () => {
      const { head, rules } = createValidationHead()
      head.push({
        title: 'test',
        meta: [{ name: 'robots', content: 'noindex' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'missing-description')).toBeFalsy()
    })
  })

  describe('missing companions', () => {
    it('warns on og:image without dimensions', () => {
      const { head, rules } = createValidationHead()
      head.push({
        meta: [
          { property: 'og:image', content: 'https://example.com/img.jpg' },
          { property: 'og:title', content: 'Title' },
          { property: 'og:description', content: 'Desc' },
        ],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'og-image-missing-dimensions')).toBeTruthy()
    })

    it('does not warn when og:image has dimensions', () => {
      const { head, rules } = createValidationHead()
      head.push({
        meta: [
          { property: 'og:image', content: 'https://example.com/img.jpg' },
          { property: 'og:image:width', content: '1200' },
          { property: 'og:image:height', content: '630' },
          { property: 'og:title', content: 'Title' },
          { property: 'og:description', content: 'Desc' },
        ],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'og-image-missing-dimensions')).toBeFalsy()
    })

    it('warns when OG tags exist but og:title is missing', () => {
      const { head, rules } = createValidationHead()
      head.push({
        meta: [
          { property: 'og:image', content: 'https://example.com/img.jpg' },
          { property: 'og:description', content: 'Desc' },
        ],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'og-missing-title')).toBeTruthy()
    })

    it('warns when OG tags exist but og:description is missing', () => {
      const { head, rules } = createValidationHead()
      head.push({
        meta: [
          { property: 'og:image', content: 'https://example.com/img.jpg' },
          { property: 'og:title', content: 'Title' },
        ],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'og-missing-description')).toBeTruthy()
    })

    it('warns on preload font without crossorigin', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [{ rel: 'preload', href: '/font.woff2', as: 'font' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'preload-font-crossorigin')).toBeTruthy()
    })

    it('does not warn on preload font with crossorigin', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [{ rel: 'preload', href: '/font.woff2', as: 'font', crossorigin: 'anonymous' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'preload-font-crossorigin')).toBeFalsy()
    })

    it('warns on preload without as', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [{ rel: 'preload', href: '/style.css' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'preload-missing-as')).toBeTruthy()
    })

    it('warns on script with src and inline content', () => {
      const { head, rules } = createValidationHead()
      head.push({
        script: [{ src: '/app.js', textContent: 'console.log("hi")' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'script-src-with-content')).toBeTruthy()
    })
  })

  describe('conflict detection', () => {
    it('warns on robots index + noindex conflict', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'robots', content: 'index, noindex' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'robots-conflict')).toBeTruthy()
    })

    it('warns on robots follow + nofollow conflict', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'robots', content: 'follow, nofollow' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'robots-conflict')).toBeTruthy()
    })

    it('does not warn on valid robots', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'robots', content: 'index, follow' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'robots-conflict')).toBeFalsy()
    })

    it('warns on viewport user-scalable=no', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'viewport', content: 'width=device-width, user-scalable=no' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'viewport-user-scalable')).toBeTruthy()
    })

    it('warns on viewport maximum-scale=1', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'viewport', content: 'width=device-width, maximum-scale=1' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'viewport-user-scalable')).toBeTruthy()
    })

    it('warns on twitter handle missing @', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'twitter:site', content: 'username' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'twitter-handle-missing-at')).toBeTruthy()
    })

    it('does not warn on twitter handle with @', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'twitter:site', content: '@username' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'twitter-handle-missing-at')).toBeFalsy()
    })

    it('does not warn on twitter numeric ID', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'twitter:site', content: '123456' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'twitter-handle-missing-at')).toBeFalsy()
    })
  })

  describe('typo detection', () => {
    it('suggests correction for og:titl typo', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ property: 'og:titl', content: 'Title' }] })
      renderSSRHead(head)
      const rule = rules.find(r => r.id === 'possible-typo')
      expect(rule).toBeTruthy()
      expect(rule!.message).toContain('og:title')
    })

    it('suggests correction for og:descriptio typo', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ property: 'og:descriptio', content: 'Desc' }] })
      renderSSRHead(head)
      const rule = rules.find(r => r.id === 'possible-typo')
      expect(rule).toBeTruthy()
      expect(rule!.message).toContain('og:description')
    })

    it('suggests correction for twitter:sit typo', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'twitter:sit', content: '@user' }] })
      renderSSRHead(head)
      const rule = rules.find(r => r.id === 'possible-typo')
      expect(rule).toBeTruthy()
      expect(rule!.message).toContain('twitter:site')
    })

    it('does not warn on completely unknown custom meta', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'x-custom:foo', content: 'bar' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'possible-typo')).toBeFalsy()
    })

    it('does not warn on valid meta names', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'description', content: 'Valid' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'possible-typo')).toBeFalsy()
    })
  })

  describe('edge cases', () => {
    it('accepts http:// as absolute URL', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [{ rel: 'canonical', href: 'http://example.com/page' }],
        meta: [
          { property: 'og:image', content: 'http://example.com/img.jpg' },
          { name: 'description', content: 'test' },
        ],
        title: 'test',
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'non-absolute-canonical')).toBeFalsy()
      expect(rules.find(r => r.id === 'non-absolute-og-url')).toBeFalsy()
    })

    it('warns on non-absolute og:video', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ property: 'og:video', content: '/video.mp4' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'non-absolute-og-url')).toBeTruthy()
    })

    it('warns on non-absolute og:audio', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ property: 'og:audio', content: '/audio.mp3' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'non-absolute-og-url')).toBeTruthy()
    })

    it('does not warn on URL meta with empty content', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ property: 'og:image', content: '' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'non-absolute-og-url')).toBeFalsy()
    })

    it('warns on twitter:creator missing @', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'twitter:creator', content: 'username' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'twitter-handle-missing-at')).toBeTruthy()
    })

    it('does not report typo for unknown property without og/article/book/profile/fb prefix', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ property: 'custom:something', content: 'val' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'possible-typo')).toBeFalsy()
    })

    it('does not report typo for unknown meta name with non-twitter colon prefix', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'custom:foo', content: 'val' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'possible-typo')).toBeFalsy()
    })

    it('does not suggest typo when no close match exists', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ property: 'og:zzzzzzzzzzz', content: 'val' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'possible-typo')).toBeFalsy()
    })

    it('warns on script with src and innerHTML', () => {
      const { head, rules } = createValidationHead()
      head.push({
        script: [{ src: '/app.js', innerHTML: '<script>alert(1)</script>' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'script-src-with-content')).toBeTruthy()
    })

    it('does not warn on canonical link without href', () => {
      const { head, rules } = createValidationHead()
      // @ts-expect-error intentionally missing href
      head.push({ link: [{ rel: 'canonical' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'non-absolute-canonical')).toBeFalsy()
    })

    it('warns on viewport maximum-scale=1.0', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'viewport', content: 'width=device-width, maximum-scale=1.0' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'viewport-user-scalable')).toBeTruthy()
    })

    it('does not warn on normal viewport', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'viewport-user-scalable')).toBeFalsy()
    })

    it('does not fire og-missing-title when no OG tags present', () => {
      const { head, rules } = createValidationHead()
      head.push({
        title: 'test',
        meta: [{ name: 'description', content: 'test' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'og-missing-title')).toBeFalsy()
      expect(rules.find(r => r.id === 'og-missing-description')).toBeFalsy()
    })

    it('does not warn missing-description when description exists', () => {
      const { head, rules } = createValidationHead()
      head.push({
        title: 'test',
        meta: [{ name: 'description', content: 'A valid description' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'missing-description')).toBeFalsy()
    })

    it('warns og-image-missing-dimensions when only width provided', () => {
      const { head, rules } = createValidationHead()
      head.push({
        meta: [
          { property: 'og:image', content: 'https://example.com/img.jpg' },
          { property: 'og:image:width', content: '1200' },
          { property: 'og:title', content: 'T' },
          { property: 'og:description', content: 'D' },
        ],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'og-image-missing-dimensions')).toBeTruthy()
    })

    it('warns og-image-missing-dimensions when only height provided', () => {
      const { head, rules } = createValidationHead()
      head.push({
        meta: [
          { property: 'og:image', content: 'https://example.com/img.jpg' },
          { property: 'og:image:height', content: '630' },
          { property: 'og:title', content: 'T' },
          { property: 'og:description', content: 'D' },
        ],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'og-image-missing-dimensions')).toBeTruthy()
    })

    it('does not call onReport when no rules triggered', () => {
      const onReport = vi.fn()
      const head = createHead({
        disableDefaults: true,
        plugins: [ValidatePlugin({ onReport })],
      })
      head.push({
        title: 'My Page',
        meta: [
          { name: 'description', content: 'A valid description' },
          { property: 'og:title', content: 'My Page' },
          { property: 'og:description', content: 'A valid description' },
          { property: 'og:image', content: 'https://example.com/img.jpg' },
          { property: 'og:image:width', content: '1200' },
          { property: 'og:image:height', content: '630' },
        ],
        link: [{ rel: 'canonical', href: 'https://example.com/page' }],
      })
      renderSSRHead(head)
      expect(onReport).not.toHaveBeenCalled()
    })

    it('does not warn empty-meta-content when content prop is absent', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ charset: 'utf-8' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'empty-meta-content')).toBeFalsy()
    })

    it('does not warn on robots with only noindex (no conflict)', () => {
      const { head, rules } = createValidationHead()
      head.push({ meta: [{ name: 'robots', content: 'noindex, follow' }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'robots-conflict')).toBeFalsy()
    })
  })

  describe('options', () => {
    it('uses default console.warn when no onReport', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const head = createHead({
        disableDefaults: true,
        plugins: [ValidatePlugin()],
      })
      head.push({ title: '' })
      renderSSRHead(head)
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })

    it('respects rules off', () => {
      const { head, rules } = createValidationHead({ rules: { 'empty-title': 'off' } })
      head.push({ title: '' })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'empty-title')).toBeFalsy()
    })

    it('overrides severity via rules config', () => {
      const { head, rules } = createValidationHead({ rules: { 'missing-title': 'info' } })
      head.push({ meta: [{ name: 'description', content: 'test' }] })
      renderSSRHead(head)
      const rule = rules.find(r => r.id === 'missing-title')
      expect(rule).toBeTruthy()
      expect(rule!.severity).toBe('info')
    })

    it('includes source on reported rules', () => {
      const results: HeadValidationRule[] = []
      const head = createHead({
        disableDefaults: true,
        plugins: [ValidatePlugin({
          onReport: r => results.push(...r),
        })],
      })
      head.push({ link: [{ rel: 'canonical', href: '/page' }] })
      renderSSRHead(head)
      const rule = results.find(r => r.id === 'non-absolute-canonical')
      expect(rule).toBeTruthy()
      expect(rule!.source).toBeDefined()
      expect(typeof rule!.source).toBe('string')
    })

    it('applies root to make source relative', () => {
      const results: HeadValidationRule[] = []
      const head = createHead({
        disableDefaults: true,
        plugins: [ValidatePlugin({
          root: process.cwd(),
          onReport: r => results.push(...r),
        })],
      })
      head.push({ link: [{ rel: 'canonical', href: '/page' }] })
      renderSSRHead(head)
      const rule = results.find(r => r.id === 'non-absolute-canonical')
      expect(rule).toBeTruthy()
      // source should not contain the absolute cwd prefix when root is set
      if (rule!.source)
        expect(rule!.source).not.toContain(process.cwd())
    })

    it('reports all rules in batch via onReport', () => {
      const { head, rules } = createValidationHead()
      head.push({
        title: '',
        meta: [{ name: 'robots', content: 'index, noindex' }],
      })
      renderSSRHead(head)
      expect(rules.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('performance hints', () => {
    it('warns on preload with fetchpriority="low"', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [{ rel: 'preload', href: '/font.woff2', as: 'font', crossorigin: 'anonymous', fetchpriority: 'low' as const }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'preload-fetchpriority-conflict')).toBeTruthy()
    })

    it('does not warn on preload with fetchpriority="high"', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [{ rel: 'preload', href: '/font.woff2', as: 'font', crossorigin: 'anonymous', fetchpriority: 'high' as const }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'preload-fetchpriority-conflict')).toBeFalsy()
    })

    it('warns when more than 6 preloads exist', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: Array.from({ length: 7 }, (_, i) => ({
          rel: 'preload' as const,
          href: `/resource-${i}.js`,
          as: 'script' as const,
        })),
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'too-many-preloads')).toBeTruthy()
    })

    it('does not warn when 6 or fewer preloads exist', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: Array.from({ length: 6 }, (_, i) => ({
          rel: 'preload' as const,
          href: `/resource-${i}.js`,
          as: 'script' as const,
        })),
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'too-many-preloads')).toBeFalsy()
    })

    it('warns on redundant dns-prefetch when preconnect exists', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [
          { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
          { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' },
        ],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'redundant-dns-prefetch')).toBeTruthy()
    })

    it('does not warn on dns-prefetch without matching preconnect', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [
          { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
          { rel: 'dns-prefetch', href: 'https://cdn.example.com' },
        ],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'redundant-dns-prefetch')).toBeFalsy()
    })

    it('warns on preload + async script conflict', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [{ rel: 'preload', href: '/analytics.js', as: 'script' as const }],
        script: [{ src: '/analytics.js', async: true }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'preload-async-defer-conflict')).toBeTruthy()
    })

    it('warns on preload + defer script conflict', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [{ rel: 'preload', href: '/app.js', as: 'script' as const }],
        script: [{ src: '/app.js', defer: true }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'preload-async-defer-conflict')).toBeTruthy()
    })

    it('does not warn on preload + blocking script', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [{ rel: 'preload', href: '/critical.js', as: 'script' as const }],
        script: [{ src: '/critical.js' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'preload-async-defer-conflict')).toBeFalsy()
    })

    it('warns on prefetch + preload conflict', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [
          { rel: 'preload', href: '/style.css', as: 'style' as const },
          { rel: 'prefetch', href: '/style.css' },
        ],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'prefetch-preload-conflict')).toBeTruthy()
    })

    it('does not warn on prefetch without matching preload', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [
          { rel: 'preload', href: '/style.css', as: 'style' as const },
          { rel: 'prefetch', href: '/next-page.js' },
        ],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'prefetch-preload-conflict')).toBeFalsy()
    })

    it('warns on large inline style (>14KB)', () => {
      const { head, rules } = createValidationHead()
      const largeCSS = 'a'.repeat(15 * 1024)
      head.push({
        style: [{ innerHTML: largeCSS }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'inline-style-size')).toBeTruthy()
    })

    it('does not warn on small inline style', () => {
      const { head, rules } = createValidationHead()
      head.push({
        style: [{ innerHTML: 'body { color: red; }' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'inline-style-size')).toBeFalsy()
    })

    it('warns on large inline script (>2KB)', () => {
      const { head, rules } = createValidationHead()
      const largeJS = 'a'.repeat(3 * 1024)
      head.push({
        script: [{ innerHTML: largeJS }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'inline-script-size')).toBeTruthy()
    })

    it('does not warn on small inline script', () => {
      const { head, rules } = createValidationHead()
      head.push({
        script: [{ innerHTML: 'console.log("hi")' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'inline-script-size')).toBeFalsy()
    })

    it('warns when more than 4 preconnects exist', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: Array.from({ length: 5 }, (_, i) => ({
          rel: 'preconnect' as const,
          href: `https://cdn${i}.example.com`,
        })),
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'too-many-preconnects')).toBeTruthy()
    })

    it('does not warn when 4 or fewer preconnects exist', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: Array.from({ length: 4 }, (_, i) => ({
          rel: 'preconnect' as const,
          href: `https://cdn${i}.example.com`,
        })),
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'too-many-preconnects')).toBeFalsy()
    })

    it('respects custom max for too-many-preloads', () => {
      const { head, rules } = createValidationHead({ rules: { 'too-many-preloads': ['warn', { max: 3 }] } })
      head.push({
        link: Array.from({ length: 4 }, (_, i) => ({
          rel: 'preload' as const,
          href: `/resource-${i}.js`,
          as: 'script' as const,
        })),
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'too-many-preloads')).toBeTruthy()
    })

    it('respects custom max for too-many-preconnects', () => {
      const { head, rules } = createValidationHead({ rules: { 'too-many-preconnects': ['warn', { max: 2 }] } })
      head.push({
        link: Array.from({ length: 3 }, (_, i) => ({
          rel: 'preconnect' as const,
          href: `https://cdn${i}.example.com`,
        })),
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'too-many-preconnects')).toBeTruthy()
    })

    it('respects custom maxKB for inline-style-size', () => {
      const { head, rules } = createValidationHead({ rules: { 'inline-style-size': ['info', { maxKB: 1 }] } })
      const css = 'a'.repeat(2 * 1024)
      head.push({ style: [{ innerHTML: css }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'inline-style-size')).toBeTruthy()
    })

    it('respects custom maxKB for inline-script-size', () => {
      const { head, rules } = createValidationHead({ rules: { 'inline-script-size': ['info', { maxKB: 1 }] } })
      const js = 'a'.repeat(1.5 * 1024)
      head.push({ script: [{ innerHTML: js }] })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'inline-script-size')).toBeTruthy()
    })

    it('tuple severity can disable a rule with options', () => {
      const { head, rules } = createValidationHead({ rules: { 'too-many-preloads': ['off', { max: 3 }] } })
      head.push({
        link: Array.from({ length: 10 }, (_, i) => ({
          rel: 'preload' as const,
          href: `/resource-${i}.js`,
          as: 'script' as const,
        })),
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'too-many-preloads')).toBeFalsy()
    })

    it('warns when meta tags are rendered beyond 1MB crawler limit', () => {
      const { head, rules } = createValidationHead({
        rules: { 'meta-beyond-1mb': ['warn', { maxBytes: 500 }] },
      })
      // Push a large inline style that pushes meta past the limit
      head.push({
        style: [{ textContent: 'x'.repeat(600) }],
      })
      head.push({
        meta: [{ property: 'og:title', content: 'test' }],
      })
      renderSSRHead(head)
      const rule = rules.find(r => r.id === 'meta-beyond-1mb')
      expect(rule).toBeTruthy()
      expect(rule!.message).toContain('og:title')
      expect(rule!.message).toContain('crawler parsing limit')
    })

    it('does not warn when meta tags are within crawler limit', () => {
      const { head, rules } = createValidationHead()
      head.push({
        style: [{ textContent: 'body { color: red }' }],
      })
      head.push({
        meta: [{ property: 'og:title', content: 'test' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'meta-beyond-1mb')).toBeFalsy()
    })

    it('warns on render-blocking script in head', () => {
      const { head, rules } = createValidationHead()
      head.push({
        script: [{ src: '/app.js' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'render-blocking-script')).toBeTruthy()
    })

    it('does not warn on async script', () => {
      const { head, rules } = createValidationHead()
      head.push({
        script: [{ src: '/app.js', async: true }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'render-blocking-script')).toBeFalsy()
    })

    it('does not warn on defer script', () => {
      const { head, rules } = createValidationHead()
      head.push({
        script: [{ src: '/app.js', defer: true }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'render-blocking-script')).toBeFalsy()
    })

    it('does not warn on module script', () => {
      const { head, rules } = createValidationHead()
      head.push({
        script: [{ src: '/app.js', type: 'module' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'render-blocking-script')).toBeFalsy()
    })

    it('warns on defer with module script (redundant)', () => {
      const { head, rules } = createValidationHead()
      head.push({
        script: [{ src: '/app.js', type: 'module', defer: true }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'defer-on-module-script')).toBeTruthy()
    })

    it('does not warn on module script without defer', () => {
      const { head, rules } = createValidationHead()
      head.push({
        script: [{ src: '/app.js', type: 'module' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'defer-on-module-script')).toBeFalsy()
    })

    it('warns on too many fetchpriority="high"', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [
          { rel: 'preload', href: '/a.js', as: 'script' as const, fetchpriority: 'high' as const },
          { rel: 'preload', href: '/b.js', as: 'script' as const, fetchpriority: 'high' as const },
          { rel: 'preload', href: '/c.js', as: 'script' as const, fetchpriority: 'high' as const },
        ],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'too-many-fetchpriority-high')).toBeTruthy()
    })

    it('does not warn on 2 or fewer fetchpriority="high"', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [
          { rel: 'preload', href: '/a.js', as: 'script' as const, fetchpriority: 'high' as const },
          { rel: 'preload', href: '/b.js', as: 'script' as const, fetchpriority: 'high' as const },
        ],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'too-many-fetchpriority-high')).toBeFalsy()
    })

    it('does not warn on preconnect with and without crossorigin (different connection pools)', () => {
      const { head, rules } = createValidationHead()
      // Non-CORS and CORS preconnects establish separate connection pools, both are intentional
      head.push({
        link: [
          { rel: 'preconnect', href: 'https://cdn.example.com' },
          { rel: 'preconnect', href: 'https://cdn.example.com', crossorigin: 'anonymous' },
        ],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'duplicate-resource-hint')).toBeFalsy()
    })

    it('warns on duplicate prefetch for same href (different keys bypass dedup)', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [
          { rel: 'prefetch' as const, href: '/next-page.js', key: 'pf1' },
          { rel: 'prefetch' as const, href: '/next-page.js', key: 'pf2' },
        ],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'duplicate-resource-hint')).toBeTruthy()
    })

    it('does not warn on different preload hrefs', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [
          { rel: 'preload', href: '/a.woff2', as: 'font' as const, crossorigin: 'anonymous' },
          { rel: 'preload', href: '/b.woff2', as: 'font' as const, crossorigin: 'anonymous' },
        ],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'duplicate-resource-hint')).toBeFalsy()
    })

    it('warns when charset is not early in head', () => {
      const { head, rules } = createValidationHead({ rules: { 'charset-not-early': ['warn', { maxPosition: 1 }] } })
      // Push CSP meta which sorts before charset (weight -30 vs -20)
      head.push({
        meta: [{ 'http-equiv': 'content-security-policy', 'content': 'default-src \'self\'' }],
      })
      head.push({
        meta: [{ charset: 'utf-8' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'charset-not-early')).toBeTruthy()
    })

    it('does not warn when charset is within maxPosition', () => {
      const { head, rules } = createValidationHead()
      head.push({
        meta: [{ charset: 'utf-8' }],
      })
      head.push({
        style: [{ innerHTML: 'body { color: red }' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'charset-not-early')).toBeFalsy()
    })

    it('warns on preload as="script" for module script (should use modulepreload)', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [{ rel: 'preload', href: '/app.mjs', as: 'script' as const }],
        script: [{ src: '/app.mjs', type: 'module' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'preload-not-modulepreload')).toBeTruthy()
    })

    it('does not warn on preload for non-module script', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [{ rel: 'preload', href: '/app.js', as: 'script' as const }],
        script: [{ src: '/app.js' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'preload-not-modulepreload')).toBeFalsy()
    })

    it('warns on preconnect missing crossorigin when CORS resources use same origin', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [
          { rel: 'preconnect', href: 'https://fonts.gstatic.com' },
          { rel: 'preload', href: 'https://fonts.gstatic.com/s/roboto.woff2', as: 'font' as const, crossorigin: 'anonymous' },
        ],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'preconnect-missing-crossorigin')).toBeTruthy()
    })

    it('does not warn on preconnect with crossorigin', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [
          { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
          { rel: 'preload', href: 'https://fonts.gstatic.com/s/roboto.woff2', as: 'font' as const, crossorigin: 'anonymous' },
        ],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'preconnect-missing-crossorigin')).toBeFalsy()
    })

    it('does not warn on intentional dual preconnect (CORS + non-CORS)', () => {
      const { head, rules } = createValidationHead()
      head.push({
        link: [
          { rel: 'preconnect', href: 'https://cdn.example.com' },
          { rel: 'preconnect', href: 'https://cdn.example.com', crossorigin: 'anonymous' },
          { rel: 'preload', href: 'https://cdn.example.com/font.woff2', as: 'font' as const, crossorigin: 'anonymous' },
        ],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'preconnect-missing-crossorigin')).toBeFalsy()
    })
  })

  describe('v2 migration', () => {
    it('warns when templateParams used without TemplateParamsPlugin', () => {
      const { head, rules } = createValidationHead()
      head.push({
        templateParams: { site: { name: 'My Site' }, separator: '|' },
        title: 'Hello',
      } as any)
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'missing-template-params-plugin')).toBeTruthy()
    })

    it('does not warn about templateParams when TemplateParamsPlugin is registered', () => {
      const results: HeadValidationRule[] = []
      const head = createHead({
        disableDefaults: true,
        plugins: [
          TemplateParamsPlugin,
          ValidatePlugin({ onReport: r => results.push(...r) }),
        ],
      })
      head.push({
        templateParams: { site: { name: 'My Site' }, separator: '|' },
        title: 'Hello',
      } as any)
      renderSSRHead(head)
      expect(results.find(r => r.id === 'missing-template-params-plugin')).toBeFalsy()
    })

    it('warns when before:/after: tagPriority used without AliasSortingPlugin', () => {
      const { head, rules } = createValidationHead()
      head.push({
        script: [{ src: '/a.js', tagPriority: 'before:script:key:b' }],
      })
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'missing-alias-sorting-plugin')).toBeTruthy()
    })

    it('does not warn about alias sorting when AliasSortingPlugin is registered', () => {
      const results: HeadValidationRule[] = []
      const head = createHead({
        disableDefaults: true,
        plugins: [
          AliasSortingPlugin,
          ValidatePlugin({ onReport: r => results.push(...r) }),
        ],
      })
      head.push({
        script: [{ src: '/a.js', tagPriority: 'before:script:key:b' }],
      })
      renderSSRHead(head)
      expect(results.find(r => r.id === 'missing-alias-sorting-plugin')).toBeFalsy()
    })

    it('warns on deprecated "children" prop', () => {
      const { head, rules } = createValidationHead()
      head.push({
        script: [{ children: 'console.log("hello")' }],
      } as any)
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'deprecated-prop-children')).toBeTruthy()
    })

    it('warns on deprecated "hid" prop', () => {
      const { head, rules } = createValidationHead()
      head.push({
        meta: [{ hid: 'description', name: 'description', content: 'test' }],
      } as any)
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'deprecated-prop-hid-vmid')).toBeTruthy()
    })

    it('warns on deprecated "vmid" prop', () => {
      const { head, rules } = createValidationHead()
      head.push({
        meta: [{ vmid: 'description', name: 'description', content: 'test' }],
      } as any)
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'deprecated-prop-hid-vmid')).toBeTruthy()
    })

    it('warns on deprecated "body" prop', () => {
      const { head, rules } = createValidationHead()
      head.push({
        script: [{ src: '/script.js', body: true }],
      } as any)
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'deprecated-prop-body')).toBeTruthy()
    })

    it('respects rule severity config for migration rules', () => {
      const { head, rules } = createValidationHead({
        rules: { 'missing-template-params-plugin': 'off' },
      })
      head.push({
        templateParams: { site: { name: 'My Site' } },
        title: 'Hello',
      } as any)
      renderSSRHead(head)
      expect(rules.find(r => r.id === 'missing-template-params-plugin')).toBeFalsy()
    })

    it('warns on deprecated "mode" option in head.push()', () => {
      const { head } = createValidationHead()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      head.push({ title: 'Test' }, { mode: 'server' } as any)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('"mode: \'server\'" option was removed in v3'),
      )
      warnSpy.mockRestore()
    })

    it('does not warn on "mode" option when rule is off', () => {
      const results: HeadValidationRule[] = []
      const head = createHead({
        disableDefaults: true,
        plugins: [
          ValidatePlugin({
            onReport: r => results.push(...r),
            rules: { 'deprecated-option-mode': 'off' },
          }),
        ],
      })
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      head.push({ title: 'Test' }, { mode: 'server' } as any)
      expect(warnSpy).not.toHaveBeenCalled()
      warnSpy.mockRestore()
    })
  })
})
