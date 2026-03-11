import type { HeadValidationRule, ValidatePluginOptions } from '../../../src/plugins'
import { renderSSRHead } from '@unhead/ssr'
import { describe, expect, it, vi } from 'vitest'
import { ValidatePlugin } from '../../../src/plugins'
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
})
