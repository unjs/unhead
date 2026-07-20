import type { PrecompiledHeadInput } from '../../src/precompiled/server'
import { describe, expect, it } from 'vitest'
import { createHead, renderSSRHead, resolveTags } from '../../src/precompiled/server'
import { createHead as createNormalHead, renderSSRHead as renderNormalSSRHead } from '../../src/server'

describe('sealed precompiled server runtime', () => {
  it('renders build-finalized plans', () => {
    const head = createHead({ disableDefaults: true })
    head._p.push([
      [10, 'title', '<title>strict</title>'],
      [100, 'meta:description', '<meta name="description" content="compiled">'],
    ])
    expect(renderSSRHead(head).headTags).toBe('<title>strict</title><meta name="description" content="compiled">')
  })

  it('uses the package-owned precompiled defaults', () => {
    const rendered = renderSSRHead(createHead())
    expect(rendered).toEqual(renderNormalSSRHead(createNormalHead(), { omitLineBreaks: true }))
    expect(rendered.htmlAttrs).toBe(' lang="en"')
    expect(rendered.headTags).toBe('<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">')
  })

  it('dedupes by priority and same-priority execution order', () => {
    const head = createHead({ disableDefaults: true })
    head._p.push([
      [100, 'meta:description', '<meta name="description" content="first">'],
      [20, 'canonical', '<link rel="canonical" href="/best">'],
    ])
    head._p.push([
      [100, 'meta:description', '<meta name="description" content="last">'],
      [100, 'canonical', '<link rel="canonical" href="/ignored">'],
    ])
    expect(renderSSRHead(head).headTags).toBe('<link rel="canonical" href="/best"><meta name="description" content="last">')
  })

  it('routes pre-rendered fragments without a runtime serializer', () => {
    const head = createHead({ disableDefaults: true })
    head._p.push([
      [100, 'htmlAttrs:lang', ' lang="en-AU"', 3],
      [100, 'bodyAttrs:class', ' class="page"', 4],
      [100, 'script:open', '<script src="/open.js"></script>', 1],
      [100, 'script:close', '<script src="/close.js"></script>', 2],
    ])
    expect(renderSSRHead(head)).toEqual({
      headTags: '',
      bodyTags: '<script src="/close.js"></script>',
      bodyTagsOpen: '<script src="/open.js"></script>',
      htmlAttrs: ' lang="en-AU"',
      bodyAttrs: ' class="page"',
    })
  })

  it('exposes only build-plan resolution', () => {
    const head = createHead({ disableDefaults: true })
    const plan: PrecompiledHeadInput = [[10, 'title', '<title>resolved</title>']]
    head._p.push(plan)
    expect(resolveTags(head)).toEqual(plan)
  })
})
