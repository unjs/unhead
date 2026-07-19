import type { ResolvableHead } from '../../src/types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TemplateParamsPlugin } from '../../src/plugins'
import { precompiledHeadInput } from '../../src/precompiled'
import { createHead, renderSSRHead } from '../../src/server'
import { renderSSRHeadSuspenseChunk } from '../../src/stream/server'
import { normalizeEntryToTags, resolveTags, walkResolver } from '../../src/utils'

function precompile(input: ResolvableHead) {
  const tags = normalizeEntryToTags(input, []).map((tag) => {
    const props: Record<string, any> = { ...tag.props }
    if (props.class instanceof Set)
      props.class = [...props.class]
    if (props.style instanceof Map)
      props.style = [...props.style]
    const extra: Record<string, any> = {}
    for (const key of ['key', 'tagPosition', 'tagPriority', 'tagDuplicateStrategy', 'innerHTML', 'textContent', 'processTemplateParams'] as const) {
      if (tag[key] !== undefined)
        extra[key] = tag[key]
    }
    if (tag._h !== undefined)
      extra._h = tag._h
    return Object.keys(extra).length
      ? { tag: tag.tag, props, ...extra }
      : { tag: tag.tag, props }
  })
  return precompiledHeadInput(JSON.parse(JSON.stringify(tags)) as any)
}

function render(input: any) {
  const head = createHead({ disableDefaults: true })
  head.push(input)
  return renderSSRHead(head)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('precompiled head entries', () => {
  it('survives framework resolver walks without invoking the reviver', () => {
    const marker = precompile({ title: 'walked' }) as any
    const revive = vi.spyOn(Object.getPrototypeOf(marker), '_r')
    expect(marker.constructor).not.toBe(Object)
    expect(walkResolver(marker, (_key, value) => value)).toBe(marker)
    expect(revive).not.toHaveBeenCalled()
  })

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
    const tags = (marker as any)._r(true, [])
    expect(tags[0].props.class).toEqual(new Set(['light', 'page']))
    expect(tags[0].props.style).toEqual(new Map([['color', 'red'], ['display', 'block']]))
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
    expect(JSON.parse(JSON.stringify(marker)).htmlAttrs).toEqual({ class: ['base'], style: { color: 'red' } })
  })

  it('does not expose carrier backing tags through public resolution', () => {
    const marker = precompile({ meta: [{ name: 'description', content: 'original' }] })
    const first = createHead({ disableDefaults: true })
    first.push(marker)
    resolveTags(first)[0].props.content = 'mutated'

    const second = createHead({ disableDefaults: true })
    second.push(marker)
    expect(renderSSRHead(second).headTags).toContain('content="original"')
  })

  it('coexists with precomputed default-init tags and shared hook invalidation', () => {
    const compiled = createHead()
    const runtime = createHead()
    const markerEntry = compiled.push(precompile({ title: 'mixed fast paths' }))
    runtime.push({ title: 'mixed fast paths' })

    const defaultEntry = compiled.entries.get(1)!
    expect(defaultEntry._precomputedTags).toBeDefined()
    expect(renderSSRHead(compiled)).toEqual(renderSSRHead(runtime))
    expect(defaultEntry._tags).toBeUndefined()
    expect(compiled.entries.get(markerEntry._i)?._tags).toBeDefined()

    const compiledSeen: number[] = []
    const runtimeSeen: number[] = []
    compiled.hooks.hook('entries:normalize', ({ entry }) => compiledSeen.push(entry._i))
    runtime.hooks.hook('entries:normalize', ({ entry }) => runtimeSeen.push(entry._i))
    expect(renderSSRHead(compiled)).toEqual(renderSSRHead(runtime))
    expect(compiledSeen).toEqual(runtimeSeen)
    expect(compiledSeen).toEqual([1, markerEntry._i])
    expect(defaultEntry._tags).toBeDefined()
  })

  it('does not reuse default-init tags after an entries hook removes itself', () => {
    const head = createHead()
    const unhook = head.hooks.hook('entries:resolve', ({ entries }) => {
      entries[0].input = { htmlAttrs: { lang: 'fr' } }
      unhook()
    })
    expect(renderSSRHead(head).htmlAttrs).toBe(' lang="fr"')
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

  it('hides synthetic identity from normalization hooks like the runtime path', () => {
    const input: ResolvableHead = { meta: [{ name: 'description', content: 'one' }] }
    const marker = precompile(input)
    const first = createHead({ disableDefaults: true })
    first.push(marker)
    resolveTags(first)

    const compiled = createHead({ disableDefaults: true })
    const runtime = createHead({ disableDefaults: true })
    for (const head of [compiled, runtime]) {
      head.hooks.hook('entries:normalize', ({ tags }) => {
        tags[0].props.content = tags[0]._d ? 'saw-dedupe' : 'no-dedupe'
        tags[0]._h = 'hook-identity'
      })
    }
    compiled.push(marker)
    runtime.push(input)
    expect(resolveTags(compiled)).toEqual(resolveTags(runtime))
    expect(compiled.entries.get(1)?._tags?.[0]._h).toBe('hook-identity')
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
    // Exercise serialization after first resolve has added runtime weights and
    // materialized any JSON-safe containers.
    expect(renderSSRHead(head).headTags).toBe('<title>streamed</title>')
    const chunk = renderSSRHeadSuspenseChunk(head)
    expect(chunk).toContain('"title":"streamed"')

    const serialized = chunk.slice(chunk.indexOf('.push(') + 6, -1)
    const streamedEntries = JSON.parse(serialized)
    const client = createHead({ disableDefaults: true })
    for (const entry of streamedEntries)
      client.push(entry)
    expect(renderSSRHead(client).headTags).toBe('<title>streamed</title>')
  })

  it('preserves configured title priority through streaming serialization', () => {
    const marker = precompile({ title: { textContent: 'priority', tagPriority: -20 } } as any)
    expect(JSON.parse(JSON.stringify(marker))).toEqual({ title: { textContent: 'priority', tagPriority: -20 } })

    const compiled = createHead({ disableDefaults: true })
    const runtime = createHead({ disableDefaults: true })
    compiled.push(marker)
    runtime.push({ title: { textContent: 'priority', tagPriority: -20 } } as any)
    expect(renderSSRHead(compiled)).toEqual(renderSSRHead(runtime))
  })

  it('preserves flat template parameter arrays through streaming serialization', () => {
    const marker = precompiledHeadInput([
      { tag: 'templateParams', props: { class: ['site', 'dark'], style: ['compact', 'print'] } },
    ] as any)

    expect(JSON.parse(JSON.stringify(marker))).toEqual({
      templateParams: { class: ['site', 'dark'], style: ['compact', 'print'] },
    })

    const head = createHead({ disableDefaults: true })
    head.push(marker)
    const chunk = renderSSRHeadSuspenseChunk(head)
    expect(chunk).toContain('"style":["compact","print"]')
  })

  it('keeps templateParams class and style values as ordinary parameters', () => {
    const input: ResolvableHead = {
      templateParams: { class: 'site', style: { color: 'red' } } as any,
      meta: [
        { name: 'class-value', content: '%class' },
        { name: 'style-value', content: '%style' },
      ],
    }
    const compiled = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
    const runtime = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
    compiled.push(precompile(input))
    runtime.push(input)
    expect(renderSSRHead(compiled)).toEqual(renderSSRHead(runtime))
  })

  it('does not mistake ordinary private-looking input for a marker', () => {
    const withHeadInput = createHead({ disableDefaults: true })
    withHeadInput.push({ _c: [], title: 'not a marker' } as any)
    expect(renderSSRHead(withHeadInput).headTags).toBe('<title>not a marker</title>')

    const malformed = createHead({ disableDefaults: true })
    malformed.push({ _c: [null], title: 'still safe' } as any)
    expect(() => renderSSRHead(malformed)).not.toThrow()
    expect(renderSSRHead(malformed).headTags).toBe('<title>still safe</title>')

    const markerShaped = createHead({ disableDefaults: true })
    markerShaped.push({ _r: 'not callable', title: 'ordinary' } as any)
    expect(renderSSRHead(markerShaped).headTags).toBe('<title>ordinary</title>')

    const callable = vi.fn(() => undefined)
    const callableInput = createHead({ disableDefaults: true })
    callableInput.push({ _r: callable, title: 'also ordinary' } as any)
    expect(renderSSRHead(callableInput).headTags).toBe('<title>also ordinary</title>')
    expect(callable).toHaveBeenCalledWith()

    const colliding = createHead({ disableDefaults: true })
    colliding.push({ _t: [], _r() {}, title: 'own method' } as any)
    expect(renderSSRHead(colliding).headTags).toBe('<title>own method</title>')
  })

  it('keeps the fast path for explicitly static resolvers', () => {
    const staticResolver = Object.assign((_key?: string, value?: any) => value, { _static: true })
    const valid = createHead({ disableDefaults: true, propResolvers: [staticResolver] })
    valid.push(precompile({ title: 'valid' }))
    expect(renderSSRHead(valid).headTags).toBe('<title>valid</title>')
  })

  it('rejects custom resolvers that are not explicitly static', () => {
    function customResolver(_key?: string, value?: any) {
      return value
    }
    const head = createHead({ disableDefaults: true, propResolvers: [customResolver] })
    head.push(precompile({ title: 'production' }))
    expect(() => renderSSRHead(head)).toThrow(/Non-static prop resolver: customResolver/)
  })
})
