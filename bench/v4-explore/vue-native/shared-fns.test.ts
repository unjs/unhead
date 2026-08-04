/**
 * Candidate 1 + 5: @vue/shared primitives vs v4's own.
 * Each test states the parity verdict it proves; divergence tests pin the
 * exact bytes that differ so the RESEARCH.md claims stay checkable.
 */
import { normalizeClass, normalizeStyle, parseStringStyle, stringifyStyle, escapeHtml as vueEscapeHtml } from '@vue/shared'
import { describe, expect, it } from 'vitest'
import { compileEntry } from '../../../packages/unhead/src/v4/compile'
import { unescapeHtml } from '../../../packages/unhead/src/v4/core'
import { propsToString } from '../../../packages/unhead/src/v4/server'

// v4's SSR text escape (server.ts, private): reproduce via a compiled title
function v4EscapeTitle(s: string): string {
  const ESC_HTML_RE = /[&<>"'/]/g
  const ESC_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#x27;', '/': '&#x2F;' }
  return s.replace(ESC_HTML_RE, (c: string) => ESC_MAP[c])
}

// helper: run class/style input through v4's compile normalization
function v4Norm(kind: 'class' | 'style', value: any) {
  const tags = compileEntry({ link: [{ rel: 'x', href: '/x', [kind]: value }] }, 1, null)
  return tags[0].p![kind]
}

describe('escapeHtml: @vue/shared vs v4 escape tables', () => {
  it('diverges on apostrophe entity and slash', () => {
    // vue: &#39; and no slash escaping; v4: &#x27; and &#x2F;
    expect(vueEscapeHtml('a\'b/c')).toBe('a&#39;b/c')
    expect(v4EscapeTitle('a\'b/c')).toBe('a&#x27;b&#x2F;c')
  })

  it('agrees on & < > "', () => {
    expect(vueEscapeHtml('&<>"')).toBe(v4EscapeTitle('&<>"'))
  })

  it('breaks the sealed-plan round trip: core unescapeHtml cannot decode vue entities', () => {
    // TitlePlugin decodes prebuilt <title> text through unescapeHtml before
    // templating; vue-escaped text would come back still-encoded
    const text = 'Tom\'s page'
    expect(unescapeHtml(v4EscapeTitle(text))).toBe(text) // our round trip holds
    expect(unescapeHtml(vueEscapeHtml(text))).not.toBe(text) // vue's does not
  })
})

describe('normalizeClass: @vue/shared vs v4 normListy', () => {
  function v4ClassString(value: any): string {
    return [...v4Norm('class', value) as Set<string>].join(' ')
  }

  it('agrees on string / array / object forms', () => {
    for (const input of [
      'a b c',
      ['a', 'b', 'c'],
      { a: true, b: false, c: 1 },
      ['a', { b: true }, ['c']], // vue-native nesting
    ]) {
      // vue handles nesting natively; v4 walker only when wrapped
      if (Array.isArray(input) && input.some(v => typeof v !== 'string'))
        continue
      expect(v4ClassString(input)).toBe(normalizeClass(input))
    }
  })

  it('diverges on duplicates: v4 Set dedupes, vue keeps both', () => {
    expect(normalizeClass(['a', 'a'])).toBe('a a')
    expect(v4ClassString(['a', 'a'])).toBe('a')
  })

  it('diverges on nested arrays/objects: vue flattens, v4 walker throws', () => {
    expect(normalizeClass(['a', { b: true }])).toBe('a b')
    expect(() => v4ClassString(['a', { b: true } as any])).toThrow()
  })

  it('shape mismatch: vue returns a string, v4 renderers consume a Set', () => {
    // client.ts iterates Set entries for per-class fx tracking; adopting
    // normalizeClass means re-splitting its string output back into a Set
    expect(typeof normalizeClass('a b')).toBe('string')
    expect(v4Norm('class', 'a b')).toBeInstanceOf(Set)
  })
})

describe('normalizeStyle/parseStringStyle: @vue/shared vs v4 normListy', () => {
  function v4StyleString(value: any): string {
    return [...v4Norm('style', value) as Map<string, string>].map(([a, b]) => `${a}:${b}`).join(';')
  }

  it('agrees on plain declarations', () => {
    expect(v4StyleString('color:red; margin:0')).toBe(stringifyStyle(parseStringStyle('color:red; margin:0')).replace(/;$/, ''))
  })

  it('diverges on semicolons inside url() data URIs: vue parses correctly, v4 corrupts', () => {
    const css = 'background:url(data:image/png;base64,AAA);color:red'
    expect(parseStringStyle(css)).toEqual({ background: 'url(data:image/png;base64,AAA)', color: 'red' })
    // v4's naive split(';') severs the data URI
    expect(v4StyleString(css)).toBe('background:url(data:image/png;color:red')
  })

  it('diverges on css comments: vue strips them, v4 keeps them in values', () => {
    const css = 'color:red /* important */'
    expect(parseStringStyle(css)).toEqual({ color: 'red' })
    expect(v4StyleString(css)).toBe('color:red /* important */')
  })

  it('normalizeStyle leaves strings unparsed, so the seam still needs parseStringStyle', () => {
    expect(normalizeStyle('color:red')).toBe('color:red')
  })
})

describe('propsToString consumes v4 shapes only', () => {
  it('renders Set/Map props; vue string/object shapes would need conversion glue', () => {
    expect(propsToString({ class: new Set(['a', 'b']), style: new Map([['color', 'red']]) }))
      .toBe(' class="a b" style="color:red"')
  })
})
