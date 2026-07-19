import type { ResolvableHead } from '../../src/types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHead, renderSSRHead } from '../../src/server'
import { renderSSRHeadSuspenseChunk } from '../../src/stream/server'
import { dedupeKey, hashTag, normalizeEntryToTags } from '../../src/utils'

function precompile(input: ResolvableHead) {
  const tags = normalizeEntryToTags(input, []).map((tag) => {
    const props: Record<string, any> = { ...tag.props }
    if (props.class instanceof Set)
      props.class = [...props.class]
    if (props.style instanceof Map)
      props.style = [...props.style]
    const d = dedupeKey(tag)
    const extra: Record<string, any> = {}
    for (const key of ['key', 'tagPosition', 'tagPriority', 'tagDuplicateStrategy', 'innerHTML', 'textContent', 'processTemplateParams'] as const) {
      if (tag[key] !== undefined)
        extra[key] = tag[key]
    }
    if (tag._h !== undefined)
      extra._h = tag._h
    else if (!d)
      extra._h = hashTag(tag)
    return Object.keys(extra).length
      ? [tag.tag, props, d || 0, extra]
      : [tag.tag, props, d]
  })
  return JSON.parse(JSON.stringify({ _c: 1, t: tags }))
}

function render(input: any) {
  const head = createHead({ disableDefaults: true })
  head.push(input)
  return renderSSRHead(head)
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('precompiled head entries', () => {
  it('revives JSON class/style containers and renders identically', () => {
    const input: ResolvableHead = {
      htmlAttrs: {
        class: ['light', 'page'],
        style: ['color: red', 'display: block'],
      },
      title: 'Precompiled',
      meta: [{ name: 'description', content: 'Static description' }],
    }
    const marker = precompile(input)
    expect(marker.t[0][1].class).toEqual(['light', 'page'])
    expect(marker.t[0][1].style).toEqual([['color', 'red'], ['display', 'block']])
    expect(render(marker)).toEqual(render(input))
  })

  it('gives entries:normalize hooks fresh mutable tag containers', () => {
    const marker = precompile({ htmlAttrs: { class: 'base', style: 'color: red' } })
    const first = createHead({ disableDefaults: true })
    first.hooks.hook('entries:normalize', ({ tags }) => {
      const props = tags[0].props as any
      expect(props.class).toBeInstanceOf(Set)
      expect(props.style).toBeInstanceOf(Map)
      props.class.add('hooked')
      props.style.set('display', 'block')
    })
    first.push(marker)
    expect(renderSSRHead(first).htmlAttrs).toContain('hooked')
    expect(renderSSRHead(first).htmlAttrs).toContain('display:block')

    const second = createHead({ disableDefaults: true })
    second.push(marker)
    expect(renderSSRHead(second).htmlAttrs).not.toContain('hooked')
    expect(marker.t[0][1].class).toEqual(['base'])
    expect(marker.t[0][1].style).toEqual([['color', 'red']])
  })

  it('recomputes identity after normalization hooks mutate props', () => {
    const input: ResolvableHead = { meta: [{ name: 'description', content: 'one' }] }
    const markerHead = createHead({ disableDefaults: true })
    const runtimeHead = createHead({ disableDefaults: true })
    for (const head of [markerHead, runtimeHead]) {
      head.hooks.hook('entries:normalize', ({ tags }) => {
        tags[0].props.name = 'robots'
      })
    }
    markerHead.push(precompile(input))
    runtimeHead.push(input)
    expect(renderSSRHead(markerHead)).toEqual(renderSSRHead(runtimeHead))
    expect(markerHead.entries.get(1)?._tags?.[0]._d).toBe('meta:robots')
  })

  it('dedupes precompiled and runtime entries identically', () => {
    const head = createHead({ disableDefaults: true })
    head.push(precompile({ meta: [{ name: 'description', content: 'compiled' }] }))
    head.push({ meta: [{ name: 'description', content: 'runtime' }] })
    expect(renderSSRHead(head).headTags).toBe('<meta name="description" content="runtime">')
  })

  it('recomputes identity when entry options are applied', () => {
    const input: ResolvableHead = { script: [{ src: '/app.js' }] }
    const compiled = createHead({ disableDefaults: true })
    const runtime = createHead({ disableDefaults: true })
    compiled.push(precompile(input), { key: 'entry-key' })
    runtime.push(input, { key: 'entry-key' })
    expect(renderSSRHead(compiled)).toEqual(renderSSRHead(runtime))
    expect(compiled.entries.get(1)?._tags?.[0]._d).toBe('script:key:entry-key')
  })

  it('takes the normal path after patching with a plain object', () => {
    const head = createHead({ disableDefaults: true })
    const entry = head.push(precompile({ title: 'before' }))
    expect(renderSSRHead(head).headTags).toBe('<title>before</title>')
    entry.patch({ title: 'after' } as any)
    expect(renderSSRHead(head).headTags).toBe('<title>after</title>')
  })

  it('keeps the marker JSON-serializable for suspense chunks', () => {
    const head = createHead({ disableDefaults: true })
    head.push(precompile({ title: 'streamed' }))
    const chunk = renderSSRHeadSuspenseChunk(head)
    expect(chunk).toContain('"_c":1')
    expect(chunk).toContain('"t":[')
  })

  it('accepts static resolvers and names incompatible resolvers in development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const staticResolver = Object.assign((_key?: string, value?: any) => value, { _static: true })
    const valid = createHead({ disableDefaults: true, propResolvers: [staticResolver] })
    valid.push(precompile({ title: 'valid' }))
    expect(renderSSRHead(valid).headTags).toBe('<title>valid</title>')

    function reactiveResolver(_key?: string, value?: any) {
      return value
    }
    const invalid = createHead({ disableDefaults: true, propResolvers: [reactiveResolver] })
    invalid.push(precompile({ title: 'invalid' }))
    expect(() => renderSSRHead(invalid)).toThrow(/reactiveResolver is not static/)
  })

  it('treats revived tags as final for incompatible resolvers in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const resolver = vi.fn((_key?: string, value?: any) => value)
    const head = createHead({ disableDefaults: true, propResolvers: [resolver] })
    head.push(precompile({ title: 'production' }))
    expect(renderSSRHead(head).headTags).toBe('<title>production</title>')
    expect(resolver).not.toHaveBeenCalled()
  })
})
