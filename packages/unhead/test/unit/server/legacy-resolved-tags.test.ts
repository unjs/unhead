import type { HeadTagInput } from 'unhead/types'
import { createHead, renderSSRHead, ssrRenderTags, tagToString } from 'unhead/server'
import { resolveTags, sanitizeTags } from 'unhead/utils'
import { describe, expect, it } from 'vitest'

describe('ssr resolved attribute inputs', () => {
  it('renders legacy tags inserted by entries:resolve with a resolve listener', () => {
    const head = createHead({ disableDefaults: true })
    head.hooks.hook('entries:resolve', ({ tags }) => {
      tags.push({ tag: 'meta', props: { name: 'description', content: 'injected description' } })
    })
    head.hooks.hook('tags:resolve', () => {})

    expect(renderSSRHead(head).headTags)
      .toBe('<meta name="description" content="injected description">')
  })

  it.each(['props', 'attrs'] as const)('renders %s replacements on spread copies of resolved links', (alias) => {
    const head = createHead({ disableDefaults: true })
    head.push({ link: [{ rel: 'canonical', href: '/original' }] })
    const tags = resolveTags(head).map(tag => ({ ...tag, [alias]: { rel: 'canonical', href: '/replacement' } }))

    expect(renderSSRHead(head, { resolvedTags: tags }).headTags)
      .toBe('<link rel="canonical" href="/replacement">')
    expect(renderSSRHead(head).headTags).toBe('<link rel="canonical" href="/original">')
  })

  it.each(['props', 'attrs'] as const)('renders %s replacements on resolved links without tag hooks', (alias) => {
    const head = createHead({ disableDefaults: true })
    head.push({ link: [{ rel: 'canonical', href: '/original' }] })
    const tags = resolveTags(head)
    tags[0][alias] = { rel: 'canonical', href: '/replacement' }

    expect(renderSSRHead(head, { resolvedTags: tags }).headTags)
      .toBe('<link rel="canonical" href="/replacement">')
    expect(renderSSRHead(head).headTags).toBe('<link rel="canonical" href="/original">')
  })

  it.each([false, true])('renders legacy replacements after script sanitization with tag hooks: %s', (withHook) => {
    const head = createHead({ disableDefaults: true })
    if (withHook)
      head.hooks.hook('tags:resolve', () => {})
    head.push({ script: [{ type: 'application/json', innerHTML: '{"value":"<"}' }] })
    const tags = resolveTags(head)
    tags[0].props = { type: 'application/ld+json', id: 'replacement' }

    expect(renderSSRHead(head, { resolvedTags: tags }).headTags)
      .toBe('<script type="application/ld+json" id="replacement">{"value":"\\u003C"}</script>')
  })

  it('keeps legacy replacements live on public sanitizer output', () => {
    const tags = sanitizeTags([{ tag: 'link', attrs: { rel: 'canonical', href: '/original' } }])
    tags[0].props = { rel: 'canonical', href: '/replacement' }

    expect(ssrRenderTags(tags).headTags).toBe('<link rel="canonical" href="/replacement">')
  })

  const renderers = {
    ssrRenderTags,
    renderSSRHead: (tags: HeadTagInput[]) => renderSSRHead(createHead({ disableDefaults: true }), { resolvedTags: tags }),
  }

  it.each(Object.entries(renderers))('%s renders legacy replacements on copied root attributes', (_, render) => {
    const head = createHead({ disableDefaults: true })
    head.push({ htmlAttrs: { lang: 'en' }, bodyAttrs: { id: 'original' } })
    const tags = resolveTags(head).map((tag) => {
      const props: Record<string, string> = tag.tag === 'htmlAttrs' ? { lang: 'fr' } : { id: 'replacement' }
      return Object.freeze({ ...tag, props })
    })

    expect(render(tags)).toMatchObject({ htmlAttrs: ' lang="fr"', bodyAttrs: ' id="replacement"' })
  })

  it('keeps canonical overrides on copies after live replacements and repeated spreads', () => {
    const head = createHead({ disableDefaults: true })
    head.push({ link: [{ rel: 'canonical', href: '/original' }] })
    const tag = resolveTags(head)[0]
    tag.attrs = { rel: 'canonical', href: '/live' }
    const legacy = { ...{ ...tag }, props: { rel: 'canonical', href: '/legacy' } }
    const canonical = { ...legacy, attrs: { rel: 'canonical', href: '/canonical' } }

    expect(tagToString(legacy)).toBe('<link rel="canonical" href="/legacy">')
    expect(tagToString(canonical)).toBe('<link rel="canonical" href="/canonical">')
    expect(ssrRenderTags(sanitizeTags([legacy])).headTags).toBe('<link rel="canonical" href="/legacy">')
    expect(renderSSRHead(head, { resolvedTags: [canonical] }).headTags)
      .toBe('<link rel="canonical" href="/canonical">')
  })

  it.each(Object.entries(renderers))('%s retains props-only root attributes without render hooks', (_, render) => {
    const tags: HeadTagInput[] = [
      Object.freeze({ tag: 'htmlAttrs', props: Object.freeze({ lang: 'en' }) }),
      Object.freeze({ tag: 'bodyAttrs', props: Object.freeze({ id: 'app' }) }),
      Object.freeze({ tag: 'meta', props: Object.freeze({ name: 'description', content: 'legacy' }) }),
    ]

    expect(render(tags)).toMatchObject({
      htmlAttrs: ' lang="en"',
      bodyAttrs: ' id="app"',
      headTags: '<meta name="description" content="legacy">',
    })
  })

  it.each(Object.entries(renderers))('%s prefers canonical attrs, including empty attributes', (_, render) => {
    const tags: HeadTagInput[] = [
      { tag: 'htmlAttrs', attrs: { lang: 'fr' }, props: { lang: 'en' } },
      { tag: 'bodyAttrs', attrs: {}, props: { id: 'legacy' } },
      { tag: 'meta', attrs: { name: 'description', content: 'canonical' }, props: { content: 'legacy' } },
    ]

    expect(render(tags)).toMatchObject({
      htmlAttrs: ' lang="fr"',
      bodyAttrs: '',
      headTags: '<meta name="description" content="canonical">',
    })
  })
})
