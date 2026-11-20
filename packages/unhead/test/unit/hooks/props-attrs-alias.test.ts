import type { HeadHooks, HeadPlugin, HeadTag, ResolvedHeadTag } from 'unhead/types'
import { CanonicalPlugin, TemplateParamsPlugin } from 'unhead/plugins'
import { createHead, renderSSRHead, tagToString } from 'unhead/server'
import { resolveTags } from 'unhead/utils'
import { describe, expect, it } from 'vitest'

describe('tag.props / tag.attrs alias', () => {
  it('accepts legacy callback annotations and array helpers', () => {
    const serialize = (tags: HeadTag[]) => tags.map(tagToString).join('')
    const head = createHead({ disableDefaults: true })
    const seen: string[] = []
    head.hooks.hook('tags:resolve', (ctx: { tags: HeadTag[] }) => {
      seen.push(serialize(ctx.tags))
    })
    head.hooks.hook('tags:resolve', (ctx) => {
      seen.push(serialize(ctx.tags))
      const arrays: HeadTag[] = ctx.tags.concat([ctx.tags[0]])
      const mixed: HeadTag[] = ctx.tags.concat(ctx.tags[0], [ctx.tags[0]])
      seen.push(serialize(arrays), serialize(mixed))
      ctx.tags = ctx.tags.concat({ tag: 'link', attrs: { href: '/canonical' } })
    })
    head.push({ title: 'home' })

    expect(renderSSRHead(head).headTags).toContain('<link href="/canonical">')
    expect(seen).toEqual([
      '<title>home</title>',
      '<title>home</title>',
      '<title>home</title><title>home</title>',
      '<title>home</title><title>home</title><title>home</title>',
    ])
  })

  it.each(['props', 'attrs'] as const)('serializes %s replacements inside the same listener', (alias) => {
    const head = createHead({ disableDefaults: true })
    let serialized = ''
    head.hooks.hook('tags:resolve', ({ tags }) => {
      const tag = tags.find(tag => tag.tag === 'link')!
      tag[alias] = { rel: 'canonical', href: '/replacement' }
      serialized = tagToString(tag)
      // The other alias must support writes immediately too.
      tag[alias === 'props' ? 'attrs' : 'props']!.href = '/final'
    })
    head.push({ link: [{ rel: 'canonical', href: '/original' }] })

    const html = renderSSRHead(head).headTags
    expect(serialized).toBe('<link rel="canonical" href="/replacement">')
    expect(html).toBe('<link rel="canonical" href="/final">')
  })

  it('accepts HeadTag annotations, plugin factories and hook index assignments', () => {
    const legacyTag: HeadTag = { tag: 'meta', props: { name: 'description', content: 'legacy factory' } }
    const makeTag = (): HeadTag => legacyTag
    const plugin: HeadPlugin = {
      key: 'legacy-factory',
      hooks: {
        'tags:resolve': ({ tags }) => {
          tags[0] = makeTag()
        },
      },
    }
    const head = createHead({ disableDefaults: true, plugins: [plugin] })
    head.push({ title: 'original' })

    expect(renderSSRHead(head).headTags).toBe('<meta name="description" content="legacy factory">')
    const [tag] = resolveTags(head)
    expect(tag.attrs).toBe(tag.props)
  })

  it.each(['entries:normalize', 'tags:beforeResolve', 'tags:resolve', 'tags:afterResolve', 'ssr:render'] as const)('accepts typed legacy and canonical tag insertions in %s', (hook) => {
    const plugin: HeadPlugin = {
      key: 'insert-links',
      hooks: {
        [hook]: ({ tags }: Parameters<HeadHooks[typeof hook]>[0]) => {
          tags.push({ tag: 'link', props: { rel: 'canonical', href: '/legacy' } })
          tags.push({ tag: 'link', attrs: { rel: 'alternate', href: '/canonical' } })
        },
      },
    }
    const resolved: ResolvedHeadTag[] = []
    const head = createHead({ disableDefaults: true, plugins: [plugin] })
    head.hooks.hook('ssr:render', ({ tags }) => {
      resolved.push(...tags.filter(tag => tag.tag === 'link'))
    })
    head.push({ title: 'home' })

    const html = renderSSRHead(head).headTags

    expect(html).toContain('<link rel="canonical" href="/legacy">')
    expect(html).toContain('<link rel="alternate" href="/canonical">')
    expect(resolved.map(tag => tag.attrs.href)).toEqual(['/legacy', '/canonical'])
    for (const tag of resolved)
      expect(tag.attrs).toBe(tag.props)
  })

  it.each(['unshift', 'splice', 'fill', 'replace'] as const)('normalizes typed tag inputs written through %s', (method) => {
    const head = createHead({ disableDefaults: true })
    head.hooks.hook('tags:resolve', (ctx) => {
      if (method === 'unshift')
        ctx.tags.unshift({ tag: 'link', props: { href: '/legacy' } })
      else if (method === 'splice')
        ctx.tags.splice(0, 1, { tag: 'link', attrs: { href: '/canonical' } })
      else if (method === 'fill')
        ctx.tags.fill({ tag: 'link', props: { href: '/legacy' } })
      else
        ctx.tags = [{ tag: 'link', props: { href: '/legacy' } }, { tag: 'link', attrs: { href: '/canonical' } }]
    })
    head.push({ title: 'home' })

    const tags = resolveTags(head).filter(tag => tag.tag === 'link')

    expect(tags.map(tag => tag.attrs.href)).toEqual(method === 'replace'
      ? ['/legacy', '/canonical']
      : [method === 'splice' ? '/canonical' : '/legacy'])
    for (const tag of tags)
      expect(tag.attrs).toBe(tag.props)
  })

  it('preserves replacements for plugins consuming the tag map', () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [TemplateParamsPlugin],
      hooks: {
        'tags:beforeResolve': ({ tags }) => {
          for (const tag of tags) {
            if (tag.tag === 'templateParams')
              tag.props = { siteName: 'replacement' }
          }
        },
      },
    })
    head.push({ title: '%siteName', templateParams: { siteName: 'original' } })

    expect(renderSSRHead(head).headTags).toBe('<title>replacement</title>')
  })

  it.each(['tags:beforeResolve', 'tags:resolve'] as const)('composes %s props replacements and inserted links with CanonicalPlugin', (hook) => {
    const head = createHead({ disableDefaults: true })
    head.hooks.hook(hook, ({ tags }) => {
      tags[0].props = { rel: 'canonical', href: '/replacement' }
      tags.push({ tag: 'link', props: { rel: 'alternate', hreflang: 'fr', href: '/fr' } })
    })
    head.use(CanonicalPlugin({ canonicalHost: 'https://example.com' }))
    head.push({ link: [{ rel: 'canonical', href: '/original' }] })

    expect(renderSSRHead(head).headTags).toBe('<link rel="canonical" href="https://example.com/replacement">\n<link rel="alternate" hreflang="fr" href="https://example.com/fr">')
  })

  it.each(['entries:normalize', 'tags:beforeResolve', 'tags:resolve', 'tags:afterResolve', 'ssr:render'] as const)('synchronizes replacements between %s listeners', (hook) => {
    const head = createHead({ disableDefaults: true })
    head.hooks.hook(hook, (ctx: { tags: HeadTag[] }) => {
      ctx.tags = ctx.tags.map(tag => ({ ...tag, props: { name: 'description', content: 'legacy' } }))
    })
    head.hooks.hook(hook, ({ tags }: { tags: HeadTag[] }) => {
      for (const tag of tags)
        tag.attrs = { ...tag.attrs, content: `${tag.attrs?.content} canonical` }
    })
    head.hooks.hook(hook, ({ tags }: { tags: HeadTag[] }) => {
      for (const tag of tags)
        tag.props.content += ' legacy'
    })
    head.push({ meta: [{ name: 'description', content: 'original' }] })

    expect(renderSSRHead(head).headTags).toBe('<meta name="description" content="legacy canonical legacy">')
    expect(renderSSRHead(head).headTags).toBe('<meta name="description" content="legacy canonical legacy">')
  })

  it('renders props replacements on htmlAttrs and meta tags in ssr:render', () => {
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'ssr:render': ({ tags }) => {
          for (const tag of tags) {
            tag.props = tag.tag === 'htmlAttrs'
              ? { lang: 'fr' }
              : { name: 'description', content: 'replacement' }
          }
        },
      },
    })
    head.push({ htmlAttrs: { lang: 'en' }, meta: [{ name: 'description', content: 'original' }] })

    const result = renderSSRHead(head)
    expect(result.htmlAttrs).toBe(' lang="fr"')
    expect(result.headTags).toBe('<meta name="description" content="replacement">')
  })

  it('uses entries:normalize props replacements for dedupe and renders inserted links', () => {
    const head = createHead({ disableDefaults: true })
    head.hooks.hook('entries:normalize', ({ tags }) => {
      for (const tag of tags) {
        if (tag.attrs.name === 'description')
          tag.props = { name: 'author', content: 'replacement' }
      }
      tags.push({ tag: 'link', props: { rel: 'canonical', href: '/page' } })
    })
    head.push({ meta: [{ name: 'author', content: 'original' }] })
    head.push({ meta: [{ name: 'description', content: 'changed' }] })

    expect(renderSSRHead(head).headTags).toBe('<meta name="author" content="replacement">\n<link rel="canonical" href="/page">')
  })

  it.each(['script', 'meta'] as const)('renders legacy props-only %s tags inserted by a plugin', (tag) => {
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'tags:resolve': ({ tags }) => {
          tags.push(tag === 'script'
            ? { tag, props: { type: 'application/ld+json' }, innerHTML: '{}' }
            : { tag, props: { name: 'description', content: 'legacy' } })
        },
      },
    })

    expect(renderSSRHead(head).headTags).toBe(tag === 'script'
      ? '<script type="application/ld+json">{}</script>'
      : '<meta name="description" content="legacy">')
  })

  it('renders immutable props replacements from a plugin', () => {
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'tags:resolve': (ctx) => {
          ctx.tags = ctx.tags.map(tag => ({ ...tag, props: { name: 'description', content: 'replacement' } }))
        },
      },
    })
    head.push({ meta: [{ name: 'description', content: 'original' }] })

    expect(renderSSRHead(head).headTags).toBe('<meta name="description" content="replacement">')
  })

  it('keeps explicit attrs authoritative on new plugin objects', () => {
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'tags:resolve': ({ tags }) => {
          tags.push({ tag: 'meta', attrs: { name: 'description', content: 'canonical' }, props: { content: 'legacy' } })
        },
      },
    })

    expect(renderSSRHead(head).headTags).toBe('<meta name="description" content="canonical">')
  })

  it('serializes attributes from a legacy props-only tag', () => {
    expect(tagToString({ tag: 'meta', props: { name: 'description', content: 'legacy' } }))
      .toBe('<meta name="description" content="legacy">')
  })

  it('supports typed legacy and attrs hooks together', () => {
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'tags:resolve': ({ tags }) => {
          for (const tag of tags)
            tag.props.content = `${tag.props.content} legacy`
        },
        'tags:afterResolve': ({ tags }) => {
          for (const tag of tags)
            tag.attrs.content = `${tag.attrs.content} attrs`
        },
      },
    })
    head.push({ meta: [{ name: 'description', content: 'original' }] })

    expect(renderSSRHead(head).headTags).toBe('<meta name="description" content="original legacy attrs">')
  })

  it('a tags:resolve hook reading tag.props sees the same values as tag.attrs', async () => {
    const seenViaProps: unknown[] = []
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'tags:resolve': ({ tags }) => {
          for (const tag of tags) {
            if (tag.tag === 'meta')
              seenViaProps.push(tag.props!.content)
          }
        },
      },
    })
    head.push({ meta: [{ name: 'description', content: 'read via props' }] })

    const result = await renderSSRHead(head)
    expect(seenViaProps).toEqual(['read via props'])
    expect(result.headTags).toContain('content="read via props"')
  })

  it('a tags:resolve hook writing tag.attrs is reflected in the rendered output', async () => {
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'tags:resolve': ({ tags }) => {
          for (const tag of tags) {
            if (tag.tag === 'meta')
              tag.attrs.content = 'written via attrs'
          }
        },
      },
    })
    head.push({ meta: [{ name: 'description', content: 'original' }] })

    const result = await renderSSRHead(head)
    expect(result.headTags).toContain('content="written via attrs"')
    expect(result.headTags).not.toContain('content="original"')
  })

  it('a hook replacing tag.props wholesale still renders the replacement', async () => {
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'tags:resolve': ({ tags }) => {
          for (const tag of tags) {
            if (tag.tag === 'meta')
              tag.props = { name: 'description', content: 'replaced via props' }
          }
        },
      },
    })
    head.push({ meta: [{ name: 'description', content: 'original' }] })

    const result = await renderSSRHead(head)
    expect(result.headTags).toContain('content="replaced via props"')
    expect(result.headTags).not.toContain('content="original"')
  })

  it('a hook reassigning tag.attrs wholesale still renders the replacement', async () => {
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'tags:resolve': ({ tags }) => {
          for (const tag of tags) {
            if (tag.tag === 'meta')
              tag.attrs = { ...tag.attrs, content: 'replaced via attrs' }
          }
        },
      },
    })
    head.push({ meta: [{ name: 'description', content: 'original' }] })

    const result = await renderSSRHead(head)
    expect(result.headTags).toContain('content="replaced via attrs"')
    expect(result.headTags).not.toContain('original')
  })

  it('a hook replacing a tag preserves its attrs replacement', async () => {
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'tags:resolve': ({ tags }) => {
          const index = tags.findIndex(tag => tag.tag === 'meta')
          const tag = tags[index]
          tags[index] = { ...tag, attrs: { ...tag.attrs, content: 'new' } }
        },
      },
    })
    head.push({ meta: [{ name: 'description', content: 'original' }] })

    const tags = resolveTags(head)
    const tag = tags.find(tag => tag.tag === 'meta')!
    const result = await renderSSRHead(head, { resolvedTags: tags })

    expect(result.headTags).toContain('content="new"')
    expect(tag.attrs).toBe(tag.props)
  })

  it('a hook pushing an attrs-only script tag with innerHTML renders without throwing', async () => {
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'tags:resolve': ({ tags }) => {
          tags.push({
            tag: 'script',
            attrs: { type: 'application/ld+json' },
            innerHTML: JSON.stringify({ '@type': 'thing' }),
          })
        },
      },
    })
    head.push({ title: 'home' })

    const result = await renderSSRHead(head)
    expect(result.headTags).toContain('<script type="application/ld+json">{"@type":"thing"}</script>')
  })
})
