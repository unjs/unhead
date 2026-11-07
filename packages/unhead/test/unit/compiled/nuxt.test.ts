import { describe, expect, it } from 'vitest'
import { compileTags, dynamicValue } from '../../../src/compiled/compile'
import { createHead, prepareHeadInput, renderSSRHead } from '../../../src/compiled/server'
import { TemplateParamsPlugin } from '../../../src/plugins'
import { createHead as createV3Head, renderSSRHead as renderV3 } from '../../../src/server'

// What Nuxt's renderer pushes per request, see bench/compiled-nuxt-route-fixtures.mjs
describe('prepareHeadInput with a key', () => {
  it('returns the compiled tags of the first input for the same key, with no compile', () => {
    const first = prepareHeadInput({ link: [{ rel: 'stylesheet', href: '/a.css', crossorigin: '' }] }, 'keyed:css')
    expect(Array.isArray(first)).toBe(true)
    expect(prepareHeadInput({ link: [{ rel: 'stylesheet', href: '/a.css', crossorigin: '' }] }, 'keyed:css')).toBe(first)
    // a compile would refuse this input, so only the cache can return compiled tags for it
    expect(prepareHeadInput({ title: () => 'dynamic' } as any, 'keyed:css')).toBe(first)
  })

  it('keeps one set of compiled tags per key', () => {
    const a = prepareHeadInput({ link: [{ rel: 'modulepreload', as: 'script', crossorigin: '', href: '/a.js' }] }, 'keyed:hints:a')
    const b = prepareHeadInput({ link: [{ rel: 'modulepreload', as: 'script', crossorigin: '', href: '/b.js' }] }, 'keyed:hints:b')
    expect(a).not.toBe(b)
    const head = createHead<any>({ disableDefaults: true })
    head.push(b)
    expect(renderSSRHead(head).headTags).toBe('<link rel="modulepreload" as="script" crossorigin href="/b.js">')
  })

  it('returns each input under a key it cannot compile', () => {
    const first = { title: () => 'a' }
    const second = { title: () => 'b' }
    expect(prepareHeadInput(first, 'keyed:dynamic')).toBe(first)
    expect(prepareHeadInput(second, 'keyed:dynamic')).toBe(second)
  })

  it('keeps the identity form', () => {
    const input = { link: [{ rel: 'icon', href: '/favicon.ico' }] }
    const compiledTags = prepareHeadInput(input)
    expect(Array.isArray(compiledTags)).toBe(true)
    expect(prepareHeadInput(input)).toBe(compiledTags)
  })
})

function ok(result: ReturnType<typeof compileTags>) {
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  // a fresh array per call, so one test cannot reach another through the memo
  return [...result.tags]
}

// `renderPayloadJsonScript` as one set of compiled tags, with the entry options of the renderer inside it
function payloadTags() {
  return ok(compileTags({
    script: [{ 'type': 'application/json', 'data-nuxt-data': 'nuxt-app', 'data-ssr': true, 'id': '__NUXT_DATA__', 'innerHTML': dynamicValue(0), 'tagPosition': 'bodyClose', 'tagPriority': 'high' }],
  }, { dynamicValues: 1 }))
}

function v3Payload(contents: string) {
  const head = createV3Head({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
  head.push({ title: 'a', templateParams: { siteName: 'S' } })
  head.push({ script: [{ 'type': 'application/json', 'innerHTML': contents, 'data-nuxt-data': 'nuxt-app', 'data-ssr': true, 'id': '__NUXT_DATA__' }] }, { tagPosition: 'bodyClose', tagPriority: 'high' })
  return renderV3(head, { omitLineBreaks: true })
}

describe('payload value', () => {
  const contents = [
    '[{"a":1},"plain"]',
    '[{"html":"</script><script>alert(1)</script>"},"<b>"]',
    '[{"t":"é ✓ \u2028 \uD83D\uDE00"},"%s %siteName 100%"]',
    ` [{"pad":true}] `,
  ]

  it.each(contents)('renders %s like v3 from the memo', (text) => {
    const compiledTags = payloadTags()
    const page = ok(compileTags({ title: 'a', templateParams: { siteName: 'S' } }))
    const render = () => {
      const head = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
      head.push(page)
      head.push(compiledTags, { values: [text] })
      return renderSSRHead(head, { omitLineBreaks: true })
    }
    expect(render()).toEqual(v3Payload(text))
    // only the memo can still return the old static parts after the compiled tags changed
    ;(compiledTags[0] as any)[1] = { ...(compiledTags[0] as any)[1], 'data-nuxt-data': 'changed' }
    expect(render()).toEqual(v3Payload(text))
  })
})

describe('request isolation', () => {
  const page = { title: 'Page', htmlAttrs: { class: 'a b' }, meta: [{ name: 'description', content: 'About %siteName' }], templateParams: { siteName: 'S' } }

  it('gives each head its own hooks, plugins, entries, options, and state', () => {
    const compiledTags = ok(compileTags(page))
    const first = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
    const second = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
    first.hooks.hook('tags:resolve', ({ tags }: any) => {
      tags.push({ tag: 'meta', props: { name: 'leak', content: 'x' } })
    })
    first.resolvedOptions.propResolvers!.push((_k, v) => v)
    first.push(compiledTags)
    first.push({ title: 'First' })
    second.push(compiledTags)
    expect(renderSSRHead(first).headTags).toContain('leak')
    expect(renderSSRHead(second).headTags).not.toContain('leak')
    expect(second.hooks).not.toBe(first.hooks)
    expect(second.plugins).not.toBe(first.plugins)
    expect(second.entries.size).toBe(1)
    expect(second.resolvedOptions.propResolvers).toHaveLength(1)
    expect(first._title).toBe('First')
    expect(second._title).toBe('Page')
    expect(second._templateParams).not.toBe(first._templateParams)
  })

  it('never lets a listener in one head change the tags of another', () => {
    const compiledTags = ok(compileTags(page))
    const copy = JSON.stringify(compiledTags)
    const render = (mutate: boolean) => {
      const head = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
      head.hooks.hook('tags:resolve', ({ tags }: any) => {
        for (const tag of tags) {
          if (mutate && tag.tag === 'meta')
            tag.props.content = 'mutated'
          if (mutate && tag.tag === 'htmlAttrs')
            tag.props.class.add('mutated')
        }
      })
      head.push(compiledTags)
      return renderSSRHead(head)
    }
    const v3 = createV3Head({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
    v3.push(page)
    const expected = renderV3(v3)
    expect(render(true).headTags).toContain('mutated')
    expect(render(true).htmlAttrs).toContain('mutated')
    expect(render(false)).toEqual(expected)
    expect(JSON.stringify(compiledTags)).toBe(copy)
  })
})
