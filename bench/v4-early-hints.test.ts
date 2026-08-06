/**
 * 103 Early Hints adapter: live-head and static-plan extraction must agree,
 * only preload/modulepreload/preconnect are hintable, nonce-bearing links are
 * skipped, and a crafted href can never inject CR/LF into the header.
 */
import type { PlanTag } from '../packages/unhead/src/v4/core'
import { describe, expect, it } from 'vitest'
import { toEarlyHints, toLinkHeader } from '../packages/unhead/src/v4/early-hints'
import { createHead } from '../packages/unhead/src/v4/server'
import { applyPage, SEALED_PAGE_PLAN, STATIC_PLANS } from './v4/fixtures'

const PAGE_HINTS = [
  '</_nuxt/runtime.js>; rel=preload; as=script',
  '</_nuxt/vendors.js>; rel=preload; as=script',
  '</_nuxt/app.js>; rel=preload; as=script',
  '</payload.json>; rel=preload; as=fetch; crossorigin',
]

function liveHead(input?: Record<string, any>) {
  const head = createHead({ disableDefaults: true })
  if (input)
    head.push(input)
  return head
}

describe('toEarlyHints: live head', () => {
  it('extracts the hintable set from a typical page', () => {
    const head = createHead()
    applyPage((input, opts) => head.push(input, opts))
    expect(toEarlyHints(head)).toEqual(PAGE_HINTS)
  })

  it('includes only preload/modulepreload/preconnect, capo-ordered', () => {
    const head = liveHead({
      link: [
        { rel: 'modulepreload', href: '/_nuxt/entry.mjs' },
        { rel: 'stylesheet', href: '/app.css' },
        { rel: 'preconnect', href: 'https://cdn.example.com', crossorigin: '' },
        { rel: 'prefetch', href: '/next.js' },
        { rel: 'dns-prefetch', href: 'https://fonts.example.com' },
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'canonical', href: 'https://example.com/' },
      ],
    })
    // preconnect (w20) sorts before modulepreload (w70); modulepreload maps to preload
    expect(toEarlyHints(head)).toEqual([
      '<https://cdn.example.com>; rel=preconnect; crossorigin',
      '</_nuxt/entry.mjs>; rel=preload',
    ])
  })

  it('carries as/crossorigin/type/fetchpriority; non-token values are quoted', () => {
    const head = liveHead({
      link: [
        { rel: 'preload', href: '/f.woff2', as: 'font', type: 'font/woff2', crossorigin: '' },
        { rel: 'preload', href: '/hero.avif', as: 'image', fetchpriority: 'high' },
      ],
    })
    expect(toEarlyHints(head)).toEqual([
      '</f.woff2>; rel=preload; as=font; crossorigin; type="font/woff2"',
      '</hero.avif>; rel=preload; as=image; fetchpriority=high',
    ])
  })

  it('skips nonce-bearing links', () => {
    const head = liveHead({
      link: [
        { rel: 'preload', as: 'style', href: '/csp.css', nonce: 'abc123' },
        { rel: 'preload', as: 'style', href: '/ok.css' },
      ],
    })
    expect(toEarlyHints(head)).toEqual(['</ok.css>; rel=preload; as=style'])
  })

  it('returns empty for headless pages', () => {
    expect(toEarlyHints(createHead())).toEqual([]) // defaults only, no links
    expect(toEarlyHints(liveHead({ title: 'About', meta: [{ name: 'description', content: 'x' }] }))).toEqual([])
    expect(toLinkHeader(liveHead())).toBe('')
  })

  it('dedupes by href+rel across entries', () => {
    const head = liveHead()
    head.push({ link: [{ rel: 'preconnect', href: 'https://cdn.example.com' }] })
    head.push({ link: [{ rel: 'preconnect', href: 'https://cdn.example.com', crossorigin: '' }] })
    head.push({ link: [{ rel: 'preload', as: 'script', href: '/app.js', key: 'a' }] })
    head.push({ link: [{ rel: 'preload', as: 'script', href: '/app.js', key: 'b' }] })
    // core identity dedupe collapses same-d preconnects (later entry wins);
    // href+rel dedupe collapses the distinctly-keyed preload pair
    expect(toEarlyHints(head)).toEqual([
      '<https://cdn.example.com>; rel=preconnect; crossorigin',
      '</app.js>; rel=preload; as=script',
    ])
  })
})

describe('toEarlyHints: static plan', () => {
  it('build-time plan produces the same list as the live head', () => {
    expect(toEarlyHints(STATIC_PLANS.flat())).toEqual(PAGE_HINTS)
  })

  it('sealed plan with holes: link tuples extract, hole tuples are skipped', () => {
    expect(toEarlyHints(SEALED_PAGE_PLAN)).toEqual(PAGE_HINTS)
  })

  it('skips nonce-bearing links and dedupes tuples', () => {
    const plan: PlanTag[] = [
      [70, 'link:preload:/csp.css', '<link rel="preload" as="style" href="/csp.css" nonce="abc">'],
      [70, 'link:preload:/x.js', '<link rel="preload" as="script" href="/x.js">'],
      [70, 'link:key:b', '<link rel="preload" as="script" href="/x.js" data-hid="b">'],
      [20, 'link:preconnect:https://cdn.x', '<link rel="preconnect" href="https://cdn.x">'],
    ]
    expect(toEarlyHints(plan)).toEqual([
      '<https://cdn.x>; rel=preconnect',
      '</x.js>; rel=preload; as=script',
    ])
  })
})

describe('header safety', () => {
  it('rejects CRLF-bearing hrefs outright', () => {
    const head = liveHead({
      link: [
        { rel: 'preload', as: 'style', href: '/x\r\nSet-Cookie: pwn=1' },
        { rel: 'preload', as: 'style', href: '/ok.css' },
      ],
    })
    const hints = toEarlyHints(head)
    expect(hints).toEqual(['</ok.css>; rel=preload; as=style'])
    expect(toLinkHeader(head)).not.toMatch(/[\r\n]/)
  })

  it('percent-encodes URI delimiters so > and " never appear raw', () => {
    const head = liveHead({
      link: [
        { rel: 'preload', as: 'style', href: '/x>y"z.css' },
        { rel: 'preload', as: 'style', href: '/my file.css' },
      ],
    })
    expect(toEarlyHints(head)).toEqual([
      '</x%3Ey%22z.css>; rel=preload; as=style',
      '</my%20file.css>; rel=preload; as=style',
    ])
  })

  it('rejects data: and javascript: hrefs', () => {
    const head = liveHead({
      link: [
        { rel: 'preload', as: 'style', href: 'data:text/css,body{}' },
        { rel: 'preconnect', href: 'javascript:alert(1)' },
        { rel: 'preconnect', href: ' JavaScript:alert(1)' },
      ],
    })
    expect(toEarlyHints(head)).toEqual([])
  })

  it('drops params whose values cannot be a token or quoted-string', () => {
    const head = liveHead({
      link: [{ rel: 'preload', href: '/a.css', as: 'style', type: 'x"\r\ninjected' }],
    })
    expect(toEarlyHints(head)).toEqual(['</a.css>; rel=preload; as=style'])
  })

  it('every emitted value matches RFC 8297 link-value grammar', () => {
    const head = createHead()
    applyPage((input, opts) => head.push(input, opts))
    head.push({
      link: [
        { rel: 'preload', href: '/f.woff2', as: 'font', type: 'font/woff2', crossorigin: '' },
        { rel: 'preconnect', href: 'https://cdn.example.com' },
        { rel: 'preload', as: 'style', href: '/über was.css' },
      ],
    })
    // <URI-Reference>; rel=token; then params as token, token=token, or token="qdtext"
    const LINK_VALUE_RE = /^<[\w\-.~!#$&'()*+,/:;=?@%[\]]+>; rel=(?:preload|preconnect)(?:; [a-z-]+(?:=(?:[\w!#$%&'*+.^`|~-]+|"[^"\\]*"))?)*$/
    const hints = toEarlyHints(head)
    expect(hints.length).toBeGreaterThan(4)
    for (const v of hints) expect(v).toMatch(LINK_VALUE_RE)
  })
})

describe('toLinkHeader', () => {
  it('joins values with comma-space for the Cloudflare auto-103 path', () => {
    expect(toLinkHeader(STATIC_PLANS.flat())).toBe(PAGE_HINTS.join(', '))
  })
})
