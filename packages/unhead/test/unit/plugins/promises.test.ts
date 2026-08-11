import { describe, expect, it, vi } from 'vitest'
import { createHead as createClientHead } from '../../../src/client'
import { createServerHead as createLegacyServerHead, legacyPlugins } from '../../../src/legacy'
import { PromisesPlugin } from '../../../src/plugins/promises'
import { createHead as createServerHead, renderSSRHead } from '../../../src/server'
import { useDom } from '../../util'

async function flushPromises() {
  await new Promise<void>(resolve => setTimeout(resolve, 0))
}

describe('promisesPlugin', () => {
  it('preserves synchronous nested input identity for later listeners', () => {
    const head = createServerHead({
      disableDefaults: true,
      plugins: [PromisesPlugin],
    })
    const input = {
      meta: [{ name: 'description', content: 'synchronous' }],
      title: 'identity',
    }
    let observedInput: unknown
    head.hooks.hook('entries:resolve', ({ entries }) => {
      observedInput = entries[0].input
    })
    head.push(input)

    const rendered = renderSSRHead(head)

    expect(observedInput).toBe(input)
    expect(rendered.headTags).toContain('<title>identity</title>')
    expect(rendered.headTags).toContain('content="synchronous"')
  })

  it('resolves thenables nested behind promised arrays and objects', async () => {
    const head = createServerHead({
      disableDefaults: true,
      plugins: [PromisesPlugin],
    })
    head.push({
      meta: Promise.resolve([
        { name: 'description', content: Promise.resolve('nested') },
      ]),
    } as any)

    expect(renderSSRHead(head).headTags).not.toContain('description')
    await flushPromises()

    expect(renderSSRHead(head).headTags).toContain('content="nested"')
  })

  it('reads synchronous getters once before a later thenable', async () => {
    let reads = 0
    const head = createServerHead({
      disableDefaults: true,
      plugins: [PromisesPlugin],
    })
    head.push({
      get title() {
        reads++
        return `title ${reads}`
      },
      meta: Promise.resolve([{ name: 'description', content: 'promised' }]),
    } as any)

    renderSSRHead(head)
    await flushPromises()

    expect(renderSSRHead(head).headTags).toContain('<title>title 1</title>')
    expect(reads).toBe(1)
  })

  it('reads synchronous array getters once before a later thenable', async () => {
    let reads = 0
    const meta = [
      { name: 'description', content: 'getter' },
      Promise.resolve({ name: 'keywords', content: 'promised' }),
    ]
    Object.defineProperty(meta, 0, {
      enumerable: true,
      get() {
        reads++
        return { name: 'description', content: `getter ${reads}` }
      },
    })
    const head = createServerHead({
      disableDefaults: true,
      plugins: [PromisesPlugin],
    })
    head.push({ meta } as any)

    renderSSRHead(head)
    await flushPromises()

    expect(renderSSRHead(head).headTags).toContain('content="getter 1"')
    expect(reads).toBe(1)
  })

  it('preserves an own __proto__ property after promise resolution', async () => {
    const head = createServerHead({
      disableDefaults: true,
      plugins: [PromisesPlugin],
    })
    const input = { title: Promise.resolve('resolved') }
    Object.defineProperty(input, '__proto__', {
      enumerable: true,
      value: Promise.resolve('own value'),
    })
    let observedInput: Record<string, unknown> | undefined
    head.hooks.hook('entries:resolve', ({ entries }) => {
      if (entries[0])
        observedInput = entries[0].input as Record<string, unknown>
    })
    head.push(input as any)

    renderSSRHead(head)
    await flushPromises()
    renderSSRHead(head)

    expect(Object.hasOwn(observedInput!, '__proto__')).toBe(true)
    expect(Reflect.get(observedInput!, '__proto__')).toBe('own value')
  })

  it('starts sibling thenables before either sibling settles', async () => {
    const started: string[] = []
    let resolveTitle!: (value: string) => void
    let resolveContent!: (value: string) => void
    const title = {
      then(resolve: (value: string) => void) {
        started.push('title')
        resolveTitle = resolve
      },
    }
    const content = {
      then(resolve: (value: string) => void) {
        started.push('content')
        resolveContent = resolve
      },
    }
    const head = createServerHead({
      disableDefaults: true,
      plugins: [PromisesPlugin],
    })
    head.push({
      title,
      meta: [{ name: 'description', content }],
    } as any)

    renderSSRHead(head)
    await Promise.resolve()

    expect(started).toEqual(['title', 'content'])
    resolveContent('concurrent')
    resolveTitle('siblings')
    await flushPromises()
    expect(renderSSRHead(head).headTags).toContain('<title>siblings</title>')
    expect(renderSSRHead(head).headTags).toContain('content="concurrent"')
  })

  it('isolates pending promise state between concurrent server heads', async () => {
    let resolveFirst!: (value: string) => void
    let resolveSecond!: (value: string) => void
    const first = createServerHead({ disableDefaults: true, plugins: [PromisesPlugin] })
    const second = createServerHead({ disableDefaults: true, plugins: [PromisesPlugin] })
    first.push({ title: new Promise<string>((resolve) => {
      resolveFirst = resolve
    }) } as any)
    second.push({ title: new Promise<string>((resolve) => {
      resolveSecond = resolve
    }) } as any)

    expect(renderSSRHead(first).headTags).not.toContain('<title>')
    expect(renderSSRHead(second).headTags).not.toContain('<title>')

    resolveSecond('second')
    await flushPromises()
    expect(renderSSRHead(first).headTags).not.toContain('<title>')
    expect(renderSSRHead(second).headTags).toContain('<title>second</title>')

    resolveFirst('first')
    await flushPromises()
    expect(renderSSRHead(first).headTags).toContain('<title>first</title>')
  })

  it('remains enabled by the legacy entrypoints', async () => {
    expect(legacyPlugins).toContain(PromisesPlugin)
    const head = createLegacyServerHead({ disableDefaults: true })
    head.push({ title: Promise.resolve('legacy') } as any)

    expect(renderSSRHead(head).headTags).not.toContain('<title>')
    await flushPromises()
    expect(renderSSRHead(head).headTags).toContain('<title>legacy</title>')
  })

  it('keeps later resolve listeners synchronous', () => {
    const head = createServerHead({
      disableDefaults: true,
      plugins: [PromisesPlugin],
    })
    const listener = vi.fn()
    head.hooks.hook('entries:resolve', listener)
    head.push({ title: Promise.resolve('resolved') } as any)

    renderSSRHead(head)

    expect(listener).toHaveBeenCalledOnce()
  })

  it('omits pending entries until a later server render', async () => {
    const head = createServerHead({
      disableDefaults: true,
      plugins: [PromisesPlugin],
    })
    head.push({ title: Promise.resolve('resolved') } as any)

    expect(renderSSRHead(head).headTags).not.toContain('<title>')
    await flushPromises()
    expect(renderSSRHead(head).headTags).toContain('<title>resolved</title>')
  })

  it('retries rejected thenables on a later server render', async () => {
    const head = createServerHead({
      disableDefaults: true,
      plugins: [PromisesPlugin],
    })
    let attempts = 0
    const retryingThenable = {
      then(resolve: (value: string) => void, reject: (reason: Error) => void) {
        attempts++
        attempts === 1 ? reject(new Error('failed')) : resolve('recovered')
      },
    }
    head.push({ title: retryingThenable } as any)

    expect(renderSSRHead(head).headTags).not.toContain('<title>')
    await flushPromises()
    expect(attempts).toBe(1)

    expect(renderSSRHead(head).headTags).not.toContain('<title>')
    await flushPromises()
    expect(attempts).toBe(2)
    expect(renderSSRHead(head).headTags).toContain('<title>recovered</title>')
  })

  it('invalidates the client after promises resolve', async () => {
    const dom = useDom()
    const head = createClientHead({
      document: dom.window.document,
      plugins: [PromisesPlugin],
    })
    head.push({ title: Promise.resolve('resolved') } as any)

    expect(dom.window.document.title).toBe('')
    await flushPromises()
    expect(dom.window.document.title).toBe('resolved')
  })

  it('ignores stale resolutions after an entry is patched', async () => {
    let resolveFirst!: (value: string) => void
    const first = new Promise<string>((resolve) => {
      resolveFirst = resolve
    })
    const dom = useDom()
    const head = createClientHead({
      document: dom.window.document,
      plugins: [PromisesPlugin],
    })
    const entry = head.push({ title: first } as any)
    entry.patch({ title: Promise.resolve('second') } as any)

    await flushPromises()
    resolveFirst('first')
    await flushPromises()

    expect(dom.window.document.title).toBe('second')
  })
})
