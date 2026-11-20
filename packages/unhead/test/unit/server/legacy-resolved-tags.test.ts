import type { HeadTagInput } from 'unhead/types'
import { createHead, renderSSRHead, ssrRenderTags } from 'unhead/server'
import { resolveTags, sanitizeTags } from 'unhead/utils'
import { describe, expect, it } from 'vitest'

describe('ssr resolved attribute inputs', () => {
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
