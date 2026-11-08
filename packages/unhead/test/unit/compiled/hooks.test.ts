import type { HeadTag } from '../../../src/types'
import { describe, expect, it } from 'vitest'
import { compileTags, dynamicValue } from '../../../src/compiled'
import { createHead, renderSSRHead } from '../../../src/compiled/server'
import { TemplateParamsPlugin } from '../../../src/plugins'
import { createHead as createV3Head, renderSSRHead as renderV3 } from '../../../src/server'

function compile(input: any, dynamicValues?: number) {
  const result = compileTags(input, { dynamicValues })
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  return result.tags
}

// Every hook name the v3 render reads, taken from a real v3 render rather than a list:
// `callHook` and `resolveTags` look a hook up by name before they call it.
function v3RenderHooks(): string[] {
  const head = createV3Head({ plugins: [TemplateParamsPlugin] })
  head.push({ title: 'a', meta: [{ name: 'x', content: '%s' }] })
  const read = new Set<string>()
  const hooks = head.hooks as any
  hooks._hooks = new Proxy(hooks._hooks, {
    get(target, name) {
      if (typeof name === 'string')
        read.add(name)
      return target[name]
    },
  })
  renderV3(head)
  return [...read].sort()
}

describe('hook listeners', () => {
  const renderHooks = v3RenderHooks()

  it('come from the v3 render pipeline', () => {
    expect(renderHooks).toContain('tags:resolve')
    expect(renderHooks).toContain('ssr:render')
    expect(renderHooks).not.toContain('script:updated')
  })

  it.each(renderHooks)('for %s take the full runtime tier', (name) => {
    const compiledTags = compile({ title: 'a', meta: [{ name: 'x', content: 'y' }] })
    const head = createHead({ disableDefaults: true })
    head.push(compiledTags)
    renderSSRHead(head)
    let calls = 0
    head.hooks.hook(name as any, () => {
      calls++
    })
    const v3 = createV3Head({ disableDefaults: true })
    v3.push({ title: 'a', meta: [{ name: 'x', content: 'y' }] })
    v3.hooks.hook(name as any, () => {})
    expect(renderSSRHead(head)).toEqual(renderV3(v3))
    expect(calls).toBeGreaterThan(0)
  })

  // `useScript` from `@unhead/vue` adds a `script:updated` listener to every SSR head
  it.each(['script:updated', 'entries:updated', 'ssr:streamChunk', 'dom:beforeRender'])('for %s keep the fast tiers', (name) => {
    expect(renderHooks).not.toContain(name)
    // only the value memo can still return the old static parts after the compiled tags changed
    const compiledTags: any[] = [...compile({ title: dynamicValue(0), meta: [{ name: 'x', content: 'static' }] }, 1)]
    const render = (listen: boolean) => {
      const head = createHead({ disableDefaults: true })
      if (listen)
        head.hooks.hook(name as any, () => {})
      head.push(compiledTags, { values: ['t'] })
      return renderSSRHead(head).headTags
    }
    expect(render(false)).toBe('<title>t</title>\n<meta name="x" content="static">')
    compiledTags[1] = ['meta', { name: 'x', content: 'changed' }, 100, 'meta:x', 0, 1]
    expect(render(true)).toBe('<title>t</title>\n<meta name="x" content="static">')
  })
})

describe('hook order', () => {
  const input = { title: 'Page', templateParams: { siteName: 'Site' }, meta: [{ name: 'description', content: 'About %siteName' }] }
  type Step = 'read' | 'use' | 'hook'
  const orders: Step[][] = [
    ['read', 'use', 'hook'],
    ['read', 'hook', 'use'],
    ['use', 'read', 'hook'],
    ['use', 'hook', 'read'],
    ['hook', 'read', 'use'],
    ['hook', 'use', 'read'],
  ]

  // A module may keep `head.hooks` and add a listener to it later. Each order of that
  // read, the template params plugin, and the listener must run the listeners as v3 does.
  it.each(orders.map(order => [order.join(', '), order] as const))('matches v3 for %s', (_, order) => {
    const run = (create: any, push: unknown) => {
      const head = create({ disableDefaults: true })
      let hooks: any
      const seen: string[] = []
      for (const step of order) {
        if (step === 'read') {
          hooks = head.hooks
        }
        else if (step === 'use') {
          head.use(TemplateParamsPlugin)
        }
        else {
          (hooks || head.hooks).hook('tags:resolve', ({ tags }: { tags: HeadTag[] }) => {
            for (const tag of tags) {
              if (tag.tag === 'meta') {
                seen.push(tag.props.content as string)
                tag.props.content = (tag.props.content as string).toUpperCase()
              }
            }
          })
        }
      }
      head.push(push)
      return { html: renderSSRHead(head).headTags, seen }
    }
    expect(run(createHead, compile(input))).toEqual(run(createV3Head, input))
    expect(run(createHead, input)).toEqual(run(createV3Head, input))
  })
})
