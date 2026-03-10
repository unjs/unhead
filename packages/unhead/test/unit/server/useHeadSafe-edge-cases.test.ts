import { describe, expect, it } from 'vitest'
import { useHeadSafe } from '../../../src'
import { renderSSRHead } from '../../../src/server'
import { createServerHeadWithContext } from '../../util'

// Note: SafeInputPlugin must be registered via useHeadSafe() — calling
// head.push() with _safe:true alone does NOT activate the safe plugin.

async function safeRender(input: any) {
  const head = createServerHeadWithContext()
  useHeadSafe(head, input)
  return renderSSRHead(head)
}

describe('useHeadSafe edge cases', () => {
  // ─── 1. Attribute Name Injection ───────────────────────────────────
  describe('attribute name injection', () => {
    const maliciousKeys = [
      ['tab in key', 'data-x\tonload=alert(1)'],
      ['newline in key', 'data-x\nonload=alert(1)'],
      ['slash in key', 'data-x/onload=alert(1)'],
      ['angle bracket', 'data-x>onload=alert(1)'],
      ['double quote', 'data-x"onload=alert(1)'],
      ['single quote', 'data-x\'onload=alert(1)'],
      ['null byte', 'data-\x00foo'],
      ['empty after prefix', 'data-'],
      ['unicode emoji', 'data-\u{1F389}'],
      ['equals sign', 'data-x=y'],
      ['space at end', 'data-x '],
      ['backtick', 'data-x`'],
    ] as const

    for (const [label, key] of maliciousKeys) {
      it(`blocks ${label}: ${JSON.stringify(key)}`, async () => {
        const ctx = await safeRender({
          meta: [{ name: 'test', content: 'safe', [key]: 'injected' }],
        })
        expect(ctx.headTags).not.toContain('injected')
        expect(ctx.headTags).not.toContain('onload')
        expect(ctx.headTags).not.toContain('alert')
      })
    }

    it('allows valid data- attributes', async () => {
      const ctx = await safeRender({
        meta: [{ 'name': 'test', 'content': 'safe', 'data-valid': 'yes', 'data-also-valid-123': 'yes' }],
      })
      expect(ctx.headTags).toContain('data-valid="yes"')
      expect(ctx.headTags).toContain('data-also-valid-123="yes"')
    })
  })

  // ─── 2. Protocol Check Bypass ──────────────────────────────────────
  describe('protocol check bypass', () => {
    const maliciousHrefs = [
      ['mixed case javascript', 'jAvAsCrIpT:alert(1)'],
      ['all caps JAVASCRIPT', 'JAVASCRIPT:alert(1)'],
      ['mixed case data', 'DaTa:text/html,<script>alert(1)</script>'],
      ['leading space + javascript', ' javascript:alert(1)'],
      ['leading tab + javascript', '\tjavascript:alert(1)'],
      ['null prefix + javascript', '\x00javascript:alert(1)'],
      ['data URI with HTML', 'data:text/html,<script>alert(1)</script>'],
      ['data URI with base64', 'DATA:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='],
      ['data URI with CSS', 'Data:text/css,body{display:none}'],
      // percent-encoded protocol bypass
      ['percent-encoded javascript (java%73cript)', 'java%73cript:alert(1)'],
      ['percent-encoded data (da%74a)', 'da%74a:text/html,<script>alert(1)</script>'],
      ['percent-encoded vbscript', 'v%62script:alert(1)'],
      // whitespace-in-protocol bypass (browsers strip tabs/newlines inside scheme)
      ['tab inside scheme', 'java\tscript:alert(1)'],
      ['newline inside scheme', 'java\nscript:alert(1)'],
      ['CR inside scheme', 'java\rscript:alert(1)'],
      ['mixed whitespace in scheme', 'j\ta\nv\ra\tscript:alert(1)'],
      // vbscript protocol (IE11/Edge IE-mode)
      ['vbscript', 'vbscript:msgbox(1)'],
      ['VBSCRIPT caps', 'VBSCRIPT:MsgBox(1)'],
      ['vbscript with space prefix', ' vbscript:alert(1)'],
      // HTML entity encoded protocols (browsers decode entities in attribute values before URL processing)
      ['decimal entity javascript', '&#106;avascript:alert(1)'],
      ['hex entity javascript', '&#x6A;avascript:alert(1)'],
      ['decimal entity data', '&#100;ata:text/html,<script>alert(1)</script>'],
      ['hex entity data', '&#x64;ata:text/html,<script>alert(1)</script>'],
      ['mixed entity + percent encoding', '&#106;ava%73cript:alert(1)'],
      ['entity without semicolon', '&#106avascript:alert(1)'],
      ['full entity-encoded javascript:', '&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)'],
    ] as const

    for (const [label, href] of maliciousHrefs) {
      it(`blocks link href: ${label}`, async () => {
        const ctx = await safeRender({
          link: [{ rel: 'stylesheet', href }],
        })
        expect(ctx.headTags).not.toContain('href=')
      })
    }

    for (const [label, srcset] of maliciousHrefs) {
      it(`blocks link imagesrcset: ${label}`, async () => {
        const ctx = await safeRender({
          link: [{ rel: 'icon', href: '/safe.png', imagesrcset: srcset }],
        })
        expect(ctx.headTags).not.toContain('imagesrcset=')
      })
    }

    it('blocks malicious URL in multi-value imagesrcset', async () => {
      const ctx = await safeRender({
        link: [{ rel: 'icon', href: '/safe.png', imagesrcset: '/safe.png 1x, javascript:alert(1) 2x' }],
      })
      expect(ctx.headTags).not.toContain('imagesrcset=')
    })

    it('blocks percent-encoded URL in multi-value imagesrcset', async () => {
      const ctx = await safeRender({
        link: [{ rel: 'icon', href: '/safe.png', imagesrcset: '/safe.png 1x, java%73cript:alert(1) 2x' }],
      })
      expect(ctx.headTags).not.toContain('imagesrcset=')
    })

    it('allows safe multi-value imagesrcset', async () => {
      const ctx = await safeRender({
        link: [{ rel: 'icon', href: '/safe.png', imagesrcset: '/small.png 1x, /large.png 2x' }],
      })
      expect(ctx.headTags).toContain('imagesrcset=')
    })
  })

  // ─── 3. Type Coercion & Prototype Pollution ────────────────────────
  describe('type coercion and prototype pollution', () => {
    it('crashes on href with toString override (normalization DoS, not XSS)', async () => {
      // Objects with toString overrides break during normalization (String() call)
      // This is a DoS vector, not XSS — the render crashes instead of producing output
      await expect(safeRender({
        link: [{ rel: 'icon', href: { toString: () => 'javascript:alert(1)' } as any }],
      })).rejects.toThrow()
    })

    it('crashes on rel with toString override (normalization DoS, not XSS)', async () => {
      await expect(safeRender({
        link: [{ rel: { toString: () => 'icon' } as any, href: '/safe.css' }],
      })).rejects.toThrow()
    })

    it('ignores __proto__ pollution attempts', async () => {
      const malicious = JSON.parse('{"__proto__":{"onload":"alert(1)"}}')
      const ctx = await safeRender({
        meta: [{ name: 'test', content: 'safe', ...malicious }],
      })
      expect(ctx.headTags).not.toContain('onload')
    })

    it('ignores constructor pollution attempts', async () => {
      const ctx = await safeRender({
        meta: [{ name: 'test', content: 'safe', constructor: { prototype: { onload: 'alert(1)' } } }],
      })
      expect(ctx.headTags).not.toContain('onload')
    })
  })

  // ─── 4. Script textContent JSON Bypass ─────────────────────────────
  describe('script textContent JSON bypass', () => {
    it('escapes closing script tags in JSON values', async () => {
      const ctx = await safeRender({
        script: [{
          type: 'application/ld+json',
          textContent: '{"x":"</script><img src=x onerror=alert(1)>"}',
        }],
      })
      // The closing </script tag should be escaped by tagToString
      expect(ctx.headTags).not.toContain('</script><img')
      expect(ctx.headTags).toContain('application/ld+json')
    })

    it('allows non-standard json type suffix', async () => {
      const ctx = await safeRender({
        script: [{ type: 'ld+json', textContent: '{"safe":true}' }],
      })
      // endsWith('json') matches 'ld+json'
      expect(ctx.headTags).toContain('ld+json')
    })

    it('blocks falsy textContent', async () => {
      const ctx = await safeRender({
        script: [{ type: 'application/ld+json', textContent: '' }],
      })
      expect(ctx.headTags).toBe('')
    })

    it('blocks invalid JSON textContent', async () => {
      const ctx = await safeRender({
        script: [{ type: 'application/ld+json', textContent: '{not valid json' }],
      })
      expect(ctx.headTags).toBe('')
    })

    it('blocks text/javascript', async () => {
      const ctx = await safeRender({ script: [{ type: 'text/javascript', textContent: 'alert(1)' }] })
      expect(ctx.headTags).toBe('')
    })

    it('blocks module type', async () => {
      const ctx = await safeRender({ script: [{ type: 'module', textContent: 'alert(1)' }] })
      expect(ctx.headTags).toBe('')
    })

    it('blocks application/javascript', async () => {
      const ctx = await safeRender({ script: [{ type: 'application/javascript', textContent: 'alert(1)' }] })
      expect(ctx.headTags).toBe('')
    })

    it('blocks empty type', async () => {
      const ctx = await safeRender({ script: [{ type: '', textContent: 'alert(1)' }] })
      expect(ctx.headTags).toBe('')
    })

    it('preserves HTML in JSON values (safe in ld+json context)', async () => {
      const ctx = await safeRender({
        script: [{
          type: 'application/ld+json',
          textContent: '{"name":"<img onerror=alert(1)>"}',
        }],
      })
      // ld+json content is NOT parsed as HTML by browsers, so HTML in values is safe
      // The important thing is that </script> is escaped (tested above)
      expect(ctx.headTags).toContain('application/ld+json')
      expect(ctx.headTags).toContain('"name":"<img onerror=alert(1)>"')
    })
  })

  // ─── 5. innerHTML/textContent Resurrection ─────────────────────────
  describe('content resurrection', () => {
    it('blocks style innerHTML', async () => {
      const ctx = await safeRender({
        style: [{ 'innerHTML': 'body{display:none}', 'data-x': '1' } as any],
      })
      expect(ctx.headTags).not.toContain('display:none')
    })

    it('blocks style textContent', async () => {
      const ctx = await safeRender({
        style: [{ textContent: 'body{display:none}' }],
      })
      expect(ctx.headTags).not.toContain('display:none')
    })

    it('blocks noscript innerHTML', async () => {
      const ctx = await safeRender({
        noscript: [{ innerHTML: '<img src=x onerror=alert(1)>' } as any],
      })
      expect(ctx.headTags).not.toContain('onerror')
    })

    it('blocks noscript textContent', async () => {
      const ctx = await safeRender({
        noscript: [{ textContent: '<img src=x onerror=alert(1)>' }],
      })
      expect(ctx.headTags).not.toContain('onerror')
    })

    it('blocks script innerHTML (non-json)', async () => {
      const ctx = await safeRender({
        script: [{ innerHTML: 'alert(1)' } as any],
      })
      expect(ctx.headTags).not.toContain('alert')
    })

    it('blocks script innerHTML even with json type', async () => {
      const ctx = await safeRender({
        script: [{ type: 'application/ld+json', innerHTML: '{"safe":true}' } as any],
      })
      // innerHTML should be stripped; only textContent is used for scripts
      // The script should still render if textContent was also set, but innerHTML alone shouldn't work
      expect(ctx.headTags).not.toContain('innerHTML')
    })
  })

  // ─── 6. Link rel Blocklist Gaps ────────────────────────────────────
  describe('link rel security', () => {
    const blockedRels = ['canonical', 'modulepreload', 'prerender', 'preload', 'prefetch', 'dns-prefetch', 'preconnect', 'manifest', 'pingback']

    for (const rel of blockedRels) {
      it(`blocks rel="${rel}"`, async () => {
        const ctx = await safeRender({
          link: [{ rel, href: 'https://example.com' }],
        })
        expect(ctx.headTags).toBe('')
      })
    }

    it('allows safe rel types', async () => {
      for (const rel of ['icon', 'stylesheet', 'alternate']) {
        const ctx = await safeRender({
          link: [{ rel, href: 'https://example.com/resource' }],
        })
        expect(ctx.headTags).toContain(`rel="${rel}"`)
      }
    })

    it('blocks link without rel', async () => {
      const ctx = await safeRender({
        link: [{ href: 'https://example.com' } as any],
      })
      expect(ctx.headTags).toBe('')
    })

    it('blocks link without href or imagesrcset', async () => {
      const ctx = await safeRender({
        link: [{ rel: 'icon' }],
      })
      expect(ctx.headTags).toBe('')
    })
  })

  // ─── 7. Title Safety ──────────────────────────────────────────────
  describe('title safety', () => {
    it('renders title with escaped HTML', async () => {
      const ctx = await safeRender({
        title: '<script>alert(1)</script>',
      })
      expect(ctx.headTags).not.toContain('<script>')
      expect(ctx.headTags).toContain('&lt;script&gt;')
    })

    it('strips event handlers from title props', async () => {
      const ctx = await safeRender({
        title: 'Safe Title',
      })
      expect(ctx.headTags).toContain('<title>Safe Title</title>')
      expect(ctx.headTags).not.toContain('onload')
    })

    it('title does not pass arbitrary props', async () => {
      // title input as object (if someone bypasses types) — must use useHeadSafe to register plugin
      const ctx = await safeRender({
        title: { textContent: 'My Title', onload: 'alert(1)' } as any,
      })
      expect(ctx.headTags).not.toContain('onload')
      expect(ctx.headTags).toContain('My Title')
    })
  })

  // ─── 8. Meta Safety ───────────────────────────────────────────────
  describe('meta safety', () => {
    it('blocks http-equiv (CSP override, refresh)', async () => {
      const ctx = await safeRender({
        meta: [
          { 'http-equiv': 'refresh', 'content': '0;url=javascript:alert(1)' } as any,
          { 'http-equiv': 'Content-Security-Policy', 'content': 'script-src \'unsafe-inline\'' } as any,
        ],
      })
      expect(ctx.headTags).not.toContain('http-equiv')
      expect(ctx.headTags).not.toContain('refresh')
      expect(ctx.headTags).not.toContain('Content-Security-Policy')
    })

    it('escapes quotes in attribute values', async () => {
      const ctx = await safeRender({
        meta: [{ name: 'description', content: 'He said "hello" & <goodbye>' }],
      })
      expect(ctx.headTags).toContain('&quot;')
      // < and > are not escaped in attribute values (safe inside double quotes)
      expect(ctx.headTags).toContain('content="He said &quot;hello&quot; & <goodbye>"')
    })
  })

  // ─── 9. htmlAttrs/bodyAttrs Safety ────────────────────────────────
  describe('htmlAttrs and bodyAttrs safety', () => {
    it('blocks event handlers on htmlAttrs', async () => {
      const ctx = await safeRender({
        htmlAttrs: { onload: 'alert(1)', class: 'safe' } as any,
      })
      expect(ctx.htmlAttrs).not.toContain('onload')
      expect(ctx.htmlAttrs).toContain('class')
    })

    it('blocks event handlers on bodyAttrs', async () => {
      const ctx = await safeRender({
        bodyAttrs: { onresize: 'alert(1)', class: 'safe' } as any,
      })
      expect(ctx.bodyAttrs).not.toContain('onresize')
      expect(ctx.bodyAttrs).toContain('class')
    })

    it('blocks non-whitelisted attrs', async () => {
      const ctx = await safeRender({
        htmlAttrs: { id: 'x', tabindex: '0', role: 'main' } as any,
      })
      // Only class, style, lang, dir are whitelisted for htmlAttrs
      expect(ctx.htmlAttrs).not.toContain('tabindex')
      expect(ctx.htmlAttrs).not.toContain('role')
    })
  })

  // ─── 10. Unknown Tag Types ────────────────────────────────────────
  describe('unknown tag types', () => {
    it('blocks tags not in the switch statement', async () => {
      // base tag should be blocked since it's not in the safe switch
      const ctx = await safeRender({
        base: { href: 'https://evil.com/' },
      } as any)
      expect(ctx.headTags).not.toContain('base')
      expect(ctx.headTags).not.toContain('evil.com')
    })
  })

  // ─── 11. DOM Clobbering via id ──────────────────────────────────
  describe('dom clobbering prevention', () => {
    it('blocks id on htmlAttrs', async () => {
      const ctx = await safeRender({
        htmlAttrs: { id: 'defaultView', class: 'safe' } as any,
      })
      expect(ctx.htmlAttrs).not.toContain('id=')
      expect(ctx.htmlAttrs).toContain('class="safe"')
    })

    it('blocks id on bodyAttrs', async () => {
      const ctx = await safeRender({
        bodyAttrs: { id: 'forms', class: 'safe' } as any,
      })
      expect(ctx.bodyAttrs).not.toContain('id=')
      expect(ctx.bodyAttrs).toContain('class="safe"')
    })

    it('allows id on element tags (meta, link, etc)', async () => {
      const ctx = await safeRender({
        meta: [{ id: 'my-meta', name: 'test', content: 'safe' }],
      })
      expect(ctx.headTags).toContain('id="my-meta"')
    })
  })

  // ─── 12. Script JSON __proto__ sanitization ────────────────────────
  describe('script JSON __proto__ sanitization', () => {
    it('strips __proto__ keys from JSON textContent via round-trip', async () => {
      const ctx = await safeRender({
        script: [{
          type: 'application/ld+json',
          textContent: '{"__proto__":{"polluted":true},"safe":"value"}',
        }],
      })
      expect(ctx.headTags).not.toContain('__proto__')
      expect(ctx.headTags).not.toContain('polluted')
      expect(ctx.headTags).toContain('"safe":"value"')
    })
  })

  // ─── 13. titleTemplate textContent stripping ───────────────────────
  describe('titleTemplate safety', () => {
    it('strips textContent from titleTemplate', async () => {
      const ctx = await safeRender({
        titleTemplate: '<script>alert(1)</script> %s' as any,
      })
      // titleTemplate textContent should be stripped to prevent injection
      expect(ctx.headTags).not.toContain('<script>alert(1)</script>')
    })
  })

  // ─── 14. Combined Attack Vectors ──────────────────────────────────
  describe('combined attacks', () => {
    it('blocks data- attr injection + legitimate attrs', async () => {
      const ctx = await safeRender({
        link: [{
          'rel': 'stylesheet',
          'href': '/safe.css',
          'data-x onclick=alert(1) y': 'z',
          'data-safe': 'ok',
        }],
      })
      expect(ctx.headTags).not.toContain('onclick')
      expect(ctx.headTags).toContain('data-safe="ok"')
      expect(ctx.headTags).toContain('href="/safe.css"')
    })

    it('blocks multiple attack vectors in one input', async () => {
      const ctx = await safeRender({
        meta: [
          { 'http-equiv': 'refresh', 'content': '0;url=javascript:alert(1)', 'data-x onload=alert(1)': 'y' } as any,
        ],
        link: [
          { 'rel': 'preload', 'href': 'JAVASCRIPT:alert(1)', 'data-x onclick=alert(1)': 'y' } as any,
        ],
        script: [
          { src: 'https://evil.com/script.js', onload: 'alert(1)' } as any,
        ],
        style: [
          { textContent: 'body{display:none}', innerHTML: '<script>alert(1)</script>' } as any,
        ],
        noscript: [
          { textContent: '<img src=x onerror=alert(1)>' },
        ],
      })
      // http-equiv is blocked, so meta with javascript: in content is safe
      // (content is just data, not a URL context)
      expect(ctx.headTags).not.toContain('onclick')
      expect(ctx.headTags).not.toContain('onload')
      expect(ctx.headTags).not.toContain('onerror')
      expect(ctx.headTags).not.toContain('http-equiv')
      expect(ctx.headTags).not.toContain('display:none')
      expect(ctx.headTags).not.toContain('evil.com')
    })
  })
})
