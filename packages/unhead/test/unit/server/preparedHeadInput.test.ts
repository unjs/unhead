import type { CreateServerHeadOptions, ResolvableHead } from '../../../src/types'
import { describe, expect, it } from 'vitest'
import { createHead as createClientHead } from '../../../src/client'
import { TemplateParamsPlugin } from '../../../src/plugins'
import { createHead, prepareHeadInput, renderSSRHead } from '../../../src/server'
import { createStreamableHead } from '../../../src/stream/server'

function appHead(): ResolvableHead {
  return {
    htmlAttrs: { lang: 'de', class: 'dark' },
    bodyAttrs: { style: { color: 'red' } },
    title: 'App',
    titleTemplate: '%s %separator %siteName',
    templateParams: { separator: '|', siteName: 'My App' },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'description', content: 'app description' },
      { property: 'og:image', content: '/a.png' },
      { property: 'og:image', content: '/b.png' },
    ],
    link: [
      { rel: 'icon', href: '/favicon.ico' },
      { rel: 'stylesheet', href: '/app.css' },
    ],
    script: [
      { src: '/app.js', defer: true },
      { type: 'application/ld+json', innerHTML: { '@type': 'WebSite', 'name': '</script>' } },
    ],
  }
}

const prepared = prepareHeadInput(appHead())

function render(init: ResolvableHead, options: CreateServerHeadOptions = {}) {
  const head = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin], ...options, init: [init] })
  head.push({
    title: 'Page',
    meta: [{ name: 'description', content: 'page description' }],
  })
  return { head, html: renderSSRHead(head) }
}

describe('prepareHeadInput', () => {
  it('precomputes prepared init entries only', () => {
    const head = createHead({ init: [prepared, appHead()] })
    expect(head.entries.get(1)?._precomputedTags).toBeDefined()
    expect(head.entries.get(2)?._precomputedTags).toBeDefined()
    expect(head.entries.get(3)?._precomputedTags).toBeUndefined()
  })

  it('shares tags across heads per entry index', () => {
    const a = createHead({ disableDefaults: true, init: [prepared] })
    const b = createHead({ disableDefaults: true, init: [prepared] })
    const c = createHead({ init: [prepared] })
    expect(a.entries.get(1)!._precomputedTags).toBe(b.entries.get(1)!._precomputedTags)
    expect(c.entries.get(2)!._precomputedTags).not.toBe(a.entries.get(1)!._precomputedTags)
    expect(c.entries.get(2)!._precomputedTags![0]._p).toBe(2 << 10)
  })

  it('output matches the normalize path exactly', () => {
    const fast = render(prepared)
    expect(render(prepared).html).toEqual(fast.html)
    expect(render(appHead()).html).toEqual(fast.html)
    const slow = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin], init: [prepared] })
    delete slow.entries.get(1)!._precomputedTags
    slow.push({
      title: 'Page',
      meta: [{ name: 'description', content: 'page description' }],
    })
    expect(renderSSRHead(slow)).toEqual(fast.html)
    expect(fast.html).toMatchInlineSnapshot(`
      {
        "bodyAttrs": " style="color:red"",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Page | My App</title>
      <link rel="stylesheet" href="/app.css">
      <script src="/app.js" defer></script>
      <meta property="og:image" content="/a.png">
      <meta property="og:image" content="/b.png">
      <link rel="icon" href="/favicon.ico">
      <script type="application/ld+json">{"@type":"WebSite","name":"\\u003C/script>"}</script>
      <meta name="description" content="page description">",
        "htmlAttrs": " lang="de" class="dark"",
      }
    `)
  })

  it('output matches the normalize path with default init', () => {
    const fast = createHead({ init: [prepared] })
    const slow = createHead({ init: [appHead()] })
    expect(renderSSRHead(fast)).toEqual(renderSSRHead(slow))
  })

  it('never caches the shared array on the entry', () => {
    const { head } = render(prepared)
    expect(head.entries.get(1)!._tags).toBeUndefined()
  })

  it('tag mutating hooks cannot contaminate other heads', () => {
    const { html } = render(prepared, {
      hooks: {
        'tags:resolve': (ctx) => {
          for (const tag of ctx.tags) {
            if (tag.props.rel === 'icon')
              tag.props.href = '/mutated.ico'
            if (tag.tag === 'htmlAttrs')
              (tag.props.class as unknown as Set<string>).add('mutated')
          }
        },
      },
    })
    expect(html.headTags).toContain('/mutated.ico')
    expect(html.htmlAttrs).toContain('mutated')
    expect(render(prepared).html).toEqual(render(appHead()).html)
  })

  it('entry hooks fall back to the normalize path', () => {
    const seen: string[] = []
    const { head, html } = render(prepared, {
      hooks: {
        'entries:normalize': ({ tags }) => {
          for (const tag of tags) {
            seen.push(tag.tag)
            if (tag.tag === 'htmlAttrs')
              tag.props.lang = 'fr'
          }
        },
      },
    })
    expect(seen).toContain('htmlAttrs')
    expect(html.htmlAttrs).toContain('lang="fr"')
    expect(head.entries.get(1)!._tags).not.toBe(head.entries.get(1)!._precomputedTags)

    const resolved = render(prepared, { hooks: { 'entries:resolve': () => {} } })
    expect(resolved.head.entries.get(1)!._tags).toBeDefined()
    expect(resolved.head.entries.get(1)!._tags).not.toBe(resolved.head.entries.get(1)!._precomputedTags)
    expect(render(prepared).html).toEqual(render(appHead()).html)
  })

  it('pushed prepared input with entry options uses the normalize path', () => {
    const head = createHead({ disableDefaults: true })
    head.push(prepared, { tagPriority: 'low' })
    expect(head.entries.get(1)?._precomputedTags).toBeUndefined()
    head.push({ link: [{ rel: 'stylesheet', href: '/page.css' }] })
    expect(renderSSRHead(head).headTags.indexOf('/page.css')).toBeLessThan(renderSSRHead(head).headTags.indexOf('/app.css'))
  })

  it('custom tagWeight uses the normalize path', () => {
    const tagWeight = (tag: any) => tag.tag === 'link' ? 1 : 100
    const head = createHead({ disableDefaults: true, tagWeight, init: [prepared] })
    expect(head.entries.get(1)?._precomputedTags).toBeUndefined()
    expect(renderSSRHead(head)).toEqual(renderSSRHead(createHead({ disableDefaults: true, tagWeight, init: [appHead()] })))
  })

  it('render tagWeight override uses the normalize path', () => {
    const tagWeight = (tag: any) => tag.tag === 'link' ? 1 : 100
    const fast = createHead({ disableDefaults: true, init: [prepared] })
    const slow = createHead({ disableDefaults: true, init: [appHead()] })
    expect(fast.entries.get(1)?._precomputedTags).toBeDefined()
    const html = renderSSRHead(fast, { tagWeight })
    expect(html).toEqual(renderSSRHead(slow, { tagWeight }))
    expect(html.headTags.startsWith('<link')).toBe(true)
  })

  it('non-static prop resolvers use the normalize path', () => {
    const propResolvers = [(_?: string, v?: any) => typeof v === 'string' ? v.toUpperCase() : v]
    const head = createHead({ disableDefaults: true, propResolvers, init: [prepared] })
    expect(head.entries.get(1)?._precomputedTags).toBeUndefined()
    expect(renderSSRHead(head).headTags).toContain('APP DESCRIPTION')
  })

  it('pending updates discard precomputed tags', () => {
    const head = createHead({ disableDefaults: true, init: [prepared] })
    const entry = head.entries.get(1)!
    entry._pending = { title: 'Patched' }
    expect(renderSSRHead(head).headTags).toBe('<title>Patched</title>')
    expect(entry._precomputedTags).toBeUndefined()
    expect(renderSSRHead(createHead({ disableDefaults: true, init: [prepared] })).headTags).toContain('<title>App %separator %siteName</title>')
  })

  it('applies to streamable heads', () => {
    const { head } = createStreamableHead({ disableDefaults: true, init: [prepared] })
    expect(head.entries.get(1)?._precomputedTags).toBeDefined()
    expect(renderSSRHead(head)).toEqual(renderSSRHead(createStreamableHead({ disableDefaults: true, init: [appHead()] }).head))
  })

  it('does not apply to client heads', () => {
    const head = createClientHead({ init: [prepared] })
    expect(head.entries.get(1)?._precomputedTags).toBeUndefined()
  })
})
