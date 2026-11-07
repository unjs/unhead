import type { HeadTag } from '../../../src/types'
import { describe, expect, it } from 'vitest'
import { compileTags, dynamicValue } from '../../../src/compiled/compile'
import { createHead, prepareHeadInput, renderSSRHead } from '../../../src/compiled/server'
import { createHead as createStrictHead, renderSSRHead as renderStrict, templateParams } from '../../../src/compiled/server-strict'
import { TemplateParamsPlugin } from '../../../src/plugins'
import { createHead as createV3Head, renderSSRHead as renderV3 } from '../../../src/server'
import { resolveTags, walkResolver } from '../../../src/utils'

// The contract: no request can observe what another request did to its head.
// Each test compiles its own compiled tags, as the bundler hoists one per call site.

function pageInput() {
  return {
    title: 'Home',
    htmlAttrs: { class: 'page', style: 'color:red' },
    templateParams: { site: { name: 'Acme', tags: ['a'] } },
    meta: [{ name: 'description', content: 'Welcome to %site.name' }],
    link: [{ rel: 'canonical', href: 'https://example.com/' }],
  }
}

function compile(input: any, dynamicValues?: number) {
  const result = compileTags(input, { dynamicValues })
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  return result.tags
}

function v3Html(input = pageInput()) {
  const head = createV3Head({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
  head.push(input)
  return renderV3(head)
}

// every value a reader can reach and edit in place
function editTags(tags: HeadTag[]) {
  for (const tag of tags) {
    const props = tag.props as Record<string, any>
    if (props.content)
      props.content = 'Private'
    if (props.lang)
      props.lang = 'xx'
    props.class?.add?.('private')
    props.style?.set?.('color', 'blue')
    if (props.site) {
      props.site.name = 'Private'
      props.site.tags.push('private')
    }
    if (tag.textContent)
      tag.textContent = 'Private'
  }
}

describe('resolveTags', () => {
  // `ssr:beforeRender` takes the v3 tier, and v3 copies tags only for a `tags:` hook,
  // so no template params plugin here
  it.each([
    ['the fast tiers', undefined],
    ['the v3 tier', 'ssr:beforeRender'],
    ['a useScript listener', 'script:updated'],
  ])('hands each head its own tags on %s', (_, hook) => {
    const compiledTags = compile(pageInput())
    const request = (edit: boolean) => {
      const head = createHead()
      if (hook)
        head.hooks.hook(hook as any, () => {})
      head.push(compiledTags)
      const html = renderSSRHead(head)
      if (edit)
        editTags(resolveTags(head))
      return html
    }
    const first = request(true)
    expect(request(false)).toEqual(first)
    expect(request(false)).toEqual(first)
    const v3 = createV3Head()
    v3.push(pageInput())
    expect(first).toEqual(renderV3(v3))
  })
})

describe('nested template params', () => {
  it('stay per head when a tags:resolve listener edits them', () => {
    const compiledTags = compile(pageInput())
    const request = (edit: boolean) => {
      const head = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
      if (edit) {
        head.hooks.hook('tags:resolve', ({ tagMap }) => {
          editTags([tagMap.get('templateParams')!])
        })
      }
      head.push(compiledTags)
      return renderSSRHead(head).headTags
    }
    expect(request(true)).toBe(v3Html().headTags)
    expect(request(false)).toBe(v3Html().headTags)
  })

  it.each([
    ['the memo', false],
    ['the mixed tier', true],
  ])('stay per head when a reader edits head._templateParams after %s', (_, loose) => {
    const compiledTags = compile(pageInput())
    const request = (edit: boolean) => {
      const head = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
      head.push(compiledTags)
      if (loose)
        head.push({ meta: [{ name: 'loose', content: '%site.name' }] })
      const html = renderSSRHead(head).headTags
      const state = structuredClone(head._templateParams)
      if (edit) {
        head._templateParams!.site.name = 'Private'
        head._templateParams!.site.tags.push('private')
      }
      return { html, state }
    }
    const first = request(true)
    expect(request(false)).toEqual(first)
    expect(request(false)).toEqual(first)
    expect(first.state.site).toEqual({ name: 'Acme', tags: ['a'] })
  })

  it('stay per head on a strict head', () => {
    const compiledTags = compile(pageInput())
    // a dynamic value keeps the sequence off the memo, so every render resolves the tags
    const dynamicValueTags = compile({ meta: [{ name: 'value', content: dynamicValue(0) }] }, 1)
    const request = (edit: boolean) => {
      const head = createStrictHead({ disableDefaults: true, plugins: [templateParams] })
      head.push(compiledTags)
      head.push(dynamicValueTags, { values: ['%x'] } as any)
      const html = renderStrict(head).headTags
      if (edit)
        (head as any)._templateParams.site.name = 'Private'
      return html
    }
    const first = request(true)
    expect(first).toContain('Welcome to Acme')
    expect(request(false)).toBe(first)
  })

  it.each([
    ['the memo', undefined],
    ['the v3 tier', 'ssr:beforeRender'],
    ['the v3 normalize path', 'entries:normalize'],
  ])('stay per head when a reader edits entry.input, rendered through %s', (_, hook) => {
    const compiledTags = compile(pageInput())
    const request = (edit: boolean) => {
      const head = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
      if (hook)
        head.hooks.hook(hook as any, () => {})
      const { _i } = head.push(compiledTags)
      const input = head.entries.get(_i)!.input as any
      const before = structuredClone(input)
      if (edit) {
        input.templateParams.site.name = 'Private'
        input.templateParams.site.tags.push('private')
        input.meta[0].content = 'Private'
        input.htmlAttrs.class = 'private'
      }
      // the second render of the editing head may see its own edit, as in v3
      return { before, html: edit ? undefined : renderSSRHead(head).headTags }
    }
    request(true)
    expect(request(false)).toEqual({ before: pageInput(), html: v3Html().headTags })
  })

  it('stay per request when a keyed prepareHeadInput input changes after the call', () => {
    const loose = { meta: [{ name: 'loose', content: 'keeps the route off the memo' }] }
    const request = (tenant: string) => {
      // a renderer builds the input per request, and the key decides it
      const input = pageInput()
      const head = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
      head.push(prepareHeadInput(input, 'isolation:tenant-page'))
      head.push(loose)
      const html = renderSSRHead(head).headTags
      input.templateParams.site.name = tenant
      return html
    }
    const v3 = createV3Head({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
    v3.push(pageInput())
    v3.push(loose)
    const expected = renderV3(v3).headTags
    expect(request('TenantA')).toBe(expected)
    expect(request('TenantB')).toBe(expected)
  })
})

describe('the Nuxt island handler', () => {
  it('cannot reach a second head through entry.input', () => {
    const app = compile({ title: 'a', link: [{ rel: 'icon', href: '/i' }], templateParams: { site: { name: 'Acme' } } })
    const page = compile({ meta: [{ name: 'x', content: '%site.name' }], link: [{ rel: 'a', href: '/b' }], script: [{ src: '/s.js' }] })
    const island = () => {
      const head = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
      head.push(app)
      head.push(page)
      const html = renderSSRHead(head)
      // `packages/nitro-server/src/runtime/handlers/island.ts` in Nuxt, with VueResolver
      // left out: it only unwraps refs, which a compiled entry never holds
      const islandHead: Record<string, any> = {}
      for (const entry of head.entries.values()) {
        const input = walkResolver(entry.input)
        for (const [key, value] of Object.entries(input)) {
          const currentValue = islandHead[key]
          if (Array.isArray(currentValue))
            currentValue.push(...(value as any[]))
          else
            islandHead[key] = value
        }
      }
      return { islandHead: structuredClone(islandHead), html, live: islandHead }
    }
    const first = island()
    expect(first.islandHead).toEqual({
      title: 'a',
      link: [{ rel: 'icon', href: '/i' }, { rel: 'a', href: '/b' }],
      templateParams: { site: { name: 'Acme' } },
      meta: [{ name: 'x', content: '%site.name' }],
      script: [{ src: '/s.js' }],
    })
    // a `render:island` listener may edit the response head in place
    first.live.templateParams.site.name = 'Private'
    first.live.link.push({ rel: 'private', href: '/p' })
    first.live.meta[0].content = 'Private'
    first.live.script[0].src = '/private.js'
    const second = island()
    expect({ islandHead: second.islandHead, html: second.html }).toEqual({ islandHead: first.islandHead, html: first.html })
    expect(renderSSRHead(createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin], init: [app, page] }))).toEqual(first.html)
  })
})
