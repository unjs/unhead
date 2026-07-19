import { describe, expect, it } from 'vitest'
import { createHead, precompiledHeadInput, renderSSRHead } from '../../src/precompiled/server'

describe('precompiled-only server runtime', () => {
  it('renders build-normalized entries without the dynamic normalizer', () => {
    const head = createHead({ disableDefaults: true })
    head.push(precompiledHeadInput([
      { tag: 'title', props: {}, textContent: 'strict' },
      { tag: 'meta', props: { name: 'description', content: 'compiled' } },
    ]))
    expect(renderSSRHead(head).headTags).toBe('<title>strict</title>\n<meta name="description" content="compiled">')
  })

  it('rejects dynamic entries instead of silently dropping them', () => {
    const head = createHead({ disableDefaults: true })
    head.push({ title: 'dynamic' })
    expect(() => renderSSRHead(head)).toThrow(/precompiled-only runtime received a dynamic head entry/)
  })

  it('uses pre-normalized defaults with normalization hooks', () => {
    const head = createHead()
    const entries: number[] = []
    head.hooks.hook('entries:normalize', ({ entry, tags }) => {
      entries.push(entry._i)
      if (tags[0].tag === 'htmlAttrs')
        tags[0].props.lang = 'fr'
    })
    expect(renderSSRHead(head).htmlAttrs).toBe(' lang="fr"')
    expect(entries).toEqual([1])
  })

  it('reweights pre-normalized defaults with a custom tag weight', () => {
    const head = createHead({ tagWeight: () => 0 })
    head.push(precompiledHeadInput([
      { tag: 'title', props: {}, textContent: 'weighted' },
    ]))
    const rendered = renderSSRHead(head)
    expect(rendered.htmlAttrs).toBe(' lang="en"')
    expect(rendered.headTags).toContain('<title>weighted</title>')
    expect(rendered.headTags).toContain('<meta charset="utf-8">')
  })

  it('accepts carrier-wrapped static patches', () => {
    const head = createHead({ disableDefaults: true })
    const entry = head.push(precompiledHeadInput([{ tag: 'title', props: {}, textContent: 'initial' }]))
    expect(renderSSRHead(head).headTags).toBe('<title>initial</title>')
    entry.patch(precompiledHeadInput([{ tag: 'title', props: {}, textContent: 'patched' }]))
    expect(renderSSRHead(head).headTags).toBe('<title>patched</title>')
  })
})
