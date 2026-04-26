import type { HeadInputView, TagInput } from '../../src/validate'
import { describe, expect, it } from 'vitest'
import {
  deferOnModuleScript,
  emptyMetaContent,
  noDeprecatedProps,
  noHtmlInTitle,
  nonAbsoluteCanonical,
  noUnknownMeta,
  numericTagPriority,
  preferDefineHelpers,
  preloadFontCrossorigin,
  preloadMissingAs,
  robotsConflict,
  scriptSrcWithContent,
  twitterHandleMissingAt,
  viewportUserScalable,
} from '../../src/validate'

function tag(props: Record<string, string | number | boolean>, tagType: TagInput['tagType'] = 'meta', extra: Partial<TagInput> = {}): TagInput {
  return {
    tagType,
    props,
    keys: new Set(Object.keys(props)),
    ...extra,
  }
}

function input(props: Record<string, string>, extra: Partial<HeadInputView> = {}): HeadInputView {
  return {
    callee: 'useHead',
    props,
    keys: new Set(Object.keys(props)),
    ...extra,
  }
}

describe('twitter-handle-missing-at', () => {
  it('passes valid handles', () => {
    expect(twitterHandleMissingAt(tag({ name: 'twitter:site', content: '@harlan_zw' }))).toEqual([])
    expect(twitterHandleMissingAt(tag({ name: 'twitter:creator', content: '12345' }))).toEqual([])
  })
  it('flags handles missing @', () => {
    const [d] = twitterHandleMissingAt(tag({ name: 'twitter:site', content: 'harlan_zw' }))
    expect(d.ruleId).toBe('twitter-handle-missing-at')
    expect(d.fix).toEqual({ type: 'replace-prop-value', key: 'content', newSource: `"@harlan_zw"` })
  })
  it('skips non-twitter meta', () => {
    expect(twitterHandleMissingAt(tag({ name: 'description', content: 'foo' }))).toEqual([])
  })
})

describe('preload-missing-as', () => {
  it('passes preload with as', () => {
    expect(preloadMissingAs(tag({ rel: 'preload', href: '/a.js', as: 'script' }, 'link'))).toEqual([])
  })
  it('flags preload missing as', () => {
    const [d] = preloadMissingAs(tag({ rel: 'preload', href: '/a.woff2' }, 'link'))
    expect(d.ruleId).toBe('preload-missing-as')
  })
  it('ignores non-preload links', () => {
    expect(preloadMissingAs(tag({ rel: 'stylesheet', href: '/a.css' }, 'link'))).toEqual([])
  })
})

describe('preload-font-crossorigin', () => {
  it('passes when crossorigin present', () => {
    expect(preloadFontCrossorigin(tag({ rel: 'preload', href: '/f.woff2', as: 'font', crossorigin: 'anonymous' }, 'link'))).toEqual([])
  })
  it('flags font preload missing crossorigin', () => {
    const [d] = preloadFontCrossorigin(tag({ rel: 'preload', href: '/f.woff2', as: 'font' }, 'link'))
    expect(d.fix).toEqual({ type: 'insert-after-prop', afterKey: 'as', insert: `, crossorigin: 'anonymous'` })
  })
})

describe('empty-meta-content', () => {
  it('passes with content', () => {
    expect(emptyMetaContent(tag({ name: 'description', content: 'hi' }))).toEqual([])
  })
  it('flags empty content', () => {
    const [d] = emptyMetaContent(tag({ name: 'description', content: '' }))
    expect(d.message).toBe('Meta tag "description" has empty content.')
  })
  it('uses property when name absent', () => {
    const [d] = emptyMetaContent(tag({ property: 'og:title', content: '' }))
    expect(d.message).toBe('Meta tag "og:title" has empty content.')
  })
})

describe('non-absolute-canonical', () => {
  it('passes absolute', () => {
    expect(nonAbsoluteCanonical(tag({ rel: 'canonical', href: 'https://example.com' }, 'link'))).toEqual([])
  })
  it('flags relative', () => {
    const [d] = nonAbsoluteCanonical(tag({ rel: 'canonical', href: '/about' }, 'link'))
    expect(d.message).toContain('/about')
  })
  it('skips when href is non-string (resolves at runtime)', () => {
    expect(nonAbsoluteCanonical(tag({ rel: 'canonical' }, 'link', { keys: new Set(['rel', 'href']) }))).toEqual([])
  })
})

describe('numeric-tag-priority', () => {
  it('passes string priority', () => {
    expect(numericTagPriority(tag({ tagPriority: 'critical' }))).toEqual([])
  })
  it('flags numeric with three suggestions', () => {
    const [d] = numericTagPriority(tag({ tagPriority: 1 }))
    expect(d.suggestions).toHaveLength(3)
    expect(d.suggestions![0].fix).toEqual({ type: 'replace-prop-value', key: 'tagPriority', newSource: `'critical'` })
  })
})

describe('robots-conflict', () => {
  it('passes coherent directives', () => {
    expect(robotsConflict(tag({ name: 'robots', content: 'index, follow' }))).toEqual([])
  })
  it('flags index/noindex', () => {
    const out = robotsConflict(tag({ name: 'robots', content: 'index, noindex' }))
    expect(out).toHaveLength(1)
    expect(out[0].message).toContain('index')
  })
  it('flags follow/nofollow', () => {
    const [d] = robotsConflict(tag({ name: 'robots', content: 'follow, nofollow' }))
    expect(d.message).toContain('follow')
  })
})

describe('script-src-with-content', () => {
  it('passes src-only', () => {
    expect(scriptSrcWithContent(tag({ src: '/x.js' }, 'script'))).toEqual([])
  })
  it('flags src + innerHTML', () => {
    const t = tag({ src: '/x.js', innerHTML: 'console.log(1)' }, 'script')
    expect(scriptSrcWithContent(t)).toHaveLength(1)
  })
  it('detects content via keys even if value not statically resolvable', () => {
    const t: TagInput = { tagType: 'script', props: { src: '/x.js' }, keys: new Set(['src', 'innerHTML']) }
    expect(scriptSrcWithContent(t)).toHaveLength(1)
  })
})

describe('defer-on-module-script', () => {
  it('passes defer on classic script', () => {
    expect(deferOnModuleScript(tag({ src: '/x.js', defer: true }, 'script'))).toEqual([])
  })
  it('flags defer on module script', () => {
    const [d] = deferOnModuleScript(tag({ src: '/x.js', type: 'module', defer: true }, 'script'))
    expect(d.fix).toEqual({ type: 'remove-prop', key: 'defer' })
  })
})

describe('viewport-user-scalable', () => {
  it('passes coherent viewport', () => {
    expect(viewportUserScalable(tag({ name: 'viewport', content: 'width=device-width, initial-scale=1' }))).toEqual([])
  })
  it('flags user-scalable=no', () => {
    expect(viewportUserScalable(tag({ name: 'viewport', content: 'width=device-width, user-scalable=no' }))).toHaveLength(1)
  })
  it('flags maximum-scale=1', () => {
    expect(viewportUserScalable(tag({ name: 'viewport', content: 'maximum-scale=1' }))).toHaveLength(1)
  })
})

describe('no-deprecated-props', () => {
  it('flags children', () => {
    const t = tag({ children: 'console.log(1)' }, 'script')
    const [d] = noDeprecatedProps(t)
    expect(d.fix).toEqual({ type: 'rename-prop', key: 'children', newKey: 'innerHTML' })
  })
  it('flags hid', () => {
    const t = tag({ hid: 'desc', name: 'description' })
    const [d] = noDeprecatedProps(t)
    expect(d.fix).toEqual({ type: 'rename-prop', key: 'hid', newKey: 'key' })
  })
  it('flags body: true', () => {
    const t = tag({ src: '/x.js', body: true }, 'script')
    const [d] = noDeprecatedProps(t)
    expect(d.fix).toEqual({ type: 'replace-prop', key: 'body', newSource: `tagPosition: 'bodyClose'` })
  })
  it('skips body: false', () => {
    expect(noDeprecatedProps(tag({ src: '/x.js', body: false }, 'script'))).toEqual([])
  })
  it('omits fix when target key already present', () => {
    const t = tag({ children: 'x', innerHTML: 'y' }, 'script')
    const [d] = noDeprecatedProps(t)
    expect(d.fix).toBeUndefined()
  })
})

describe('no-unknown-meta', () => {
  it('passes known property', () => {
    expect(noUnknownMeta(tag({ property: 'og:title', content: 'x' }))).toEqual([])
  })
  it('suggests fix for typo in og: property', () => {
    const [d] = noUnknownMeta(tag({ property: 'og:titel', content: 'x' }))
    expect(d.fix).toEqual({ type: 'replace-prop-value', key: 'property', newSource: `'og:title'` })
  })
  it('suggests fix for typo in name', () => {
    const [d] = noUnknownMeta(tag({ name: 'discription', content: 'x' }))
    expect(d.message).toContain('description')
  })
  it('skips unknown vendor namespaces it does not recognise', () => {
    expect(noUnknownMeta(tag({ name: 'vendor:foo', content: 'x' }))).toEqual([])
  })
})

describe('no-html-in-title', () => {
  it('passes plain title', () => {
    expect(noHtmlInTitle(input({ title: 'Hello' }))).toEqual([])
  })
  it('flags HTML in title', () => {
    const [d] = noHtmlInTitle(input({ title: 'Hello <b>World</b>' }))
    expect(d.ruleId).toBe('html-in-title')
  })
})

describe('prefer-define-helpers', () => {
  it('skips standalone tags', () => {
    expect(preferDefineHelpers(tag({ rel: 'preload', as: 'script', href: '/a.js' }, 'link', { inArray: false }))).toEqual([])
  })
  it('flags link in array, surfaces suggestion when helper not imported', () => {
    const [d] = preferDefineHelpers(tag({ rel: 'preload', as: 'script', href: '/a.js' }, 'link', { inArray: true }))
    expect(d.fix).toBeUndefined()
    expect(d.suggestions).toHaveLength(1)
  })
  it('promotes to fix when helper imported', () => {
    const [d] = preferDefineHelpers(
      tag({ rel: 'preload', as: 'script', href: '/a.js' }, 'link', { inArray: true }),
      { importedHelpers: new Map([['defineLink', 'defineLink']]) },
    )
    expect(d.fix).toEqual({ type: 'wrap-tag', wrapWith: 'defineLink' })
  })
  it('uses the local binding when helper is imported under an alias', () => {
    const [d] = preferDefineHelpers(
      tag({ rel: 'preload', as: 'script', href: '/a.js' }, 'link', { inArray: true }),
      { importedHelpers: new Map([['defineLink', 'dl']]) },
    )
    expect(d.fix).toEqual({ type: 'wrap-tag', wrapWith: 'dl' })
  })
  it('skips meta/noscript/style (no helper exists)', () => {
    expect(preferDefineHelpers(tag({ name: 'description', content: 'x' }, 'meta', { inArray: true }))).toEqual([])
  })
})
