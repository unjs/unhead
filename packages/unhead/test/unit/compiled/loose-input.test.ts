import { describe, expect, it } from 'vitest'
import { compileTags, createHead, dynamicValue, getRenderTier, renderSSRHead } from '../../../src/compiled/server'
import { createHead as createV3Head, renderSSRHead as renderV3 } from '../../../src/server'

function compile(input: any, dynamicValues?: number) {
  const result = compileTags(input, { valueCount: dynamicValues })
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  return result.tags
}

// Each shape here differs from the tags that normalize makes of it: a style and a class to
// join, an attribute name to lowercase, and a JSON object to serialize.
function written(): any {
  return {
    htmlAttrs: { style: 'color: red', class: ['a', 'b'] },
    link: [{ rel: 'alternate', hrefLang: 'en', href: '/en' }],
    script: [{ type: 'application/ld+json', innerHTML: { a: 1 } }],
  }
}

type Create = (options: any) => any

// what a dynamic prop resolver reads, node by node
function resolverReads(create: Create, render: (head: any) => unknown, push: (head: any) => void) {
  const reads: [string | undefined, string][] = []
  const head = create({
    disableDefaults: true,
    propResolvers: [(key: string | undefined, value: unknown) => {
      reads.push([key, JSON.stringify(value)])
      return value
    }],
  })
  push(head)
  return { html: render(head), reads }
}

// what a listener of an entry hook reads
function listenerReads(hook: 'entries:normalize' | 'entries:resolve', create: Create, render: (head: any) => unknown, push: (head: any) => void) {
  const reads: string[] = []
  const head = create({ disableDefaults: true })
  head.hooks.hook(hook, (ctx: any) => {
    for (const entry of ctx.entries || [ctx.entry])
      reads.push(JSON.stringify(entry.input))
  })
  push(head)
  return { html: render(head), reads }
}

describe('the loose option of a compiled entry', () => {
  it('gives a dynamic prop resolver the input as written', () => {
    const v3 = resolverReads(createV3Head, renderV3, head => head.push(written()))
    const compiled = resolverReads(createHead, renderSSRHead, head => head.push(compile(written()), { loose: written }))
    expect(compiled).toEqual(v3)
    expect(v3.reads).toContainEqual(['hrefLang', '"en"'])
    expect(v3.reads).toContainEqual(['style', '"color: red"'])
  })

  it('gives a dynamic prop resolver each value as written', () => {
    const input = (href: unknown) => ({ link: [{ rel: 'canonical', key: 'canonical', hrefLang: 'en', href }] })
    const v3 = resolverReads(createV3Head, renderV3, head => head.push(input('/page')))
    const compiled = resolverReads(createHead, renderSSRHead, head => head.push(compile(input(dynamicValue(0)), 1), { values: ['/page'], loose: () => input('/page') }))
    expect(compiled).toEqual(v3)
  })

  it.each(['entries:normalize', 'entries:resolve'] as const)('gives a %s listener the input as written', (hook) => {
    const v3 = listenerReads(hook, createV3Head, renderV3, head => head.push(written()))
    const compiled = listenerReads(hook, createHead, renderSSRHead, head => head.push(compile(written()), { loose: written }))
    expect(compiled).toEqual(v3)
    expect(v3.reads).toEqual([JSON.stringify(written())])
  })

  it('gives a listener the patched input as written', () => {
    const patched = () => ({ htmlAttrs: { style: 'color: blue' } })
    const v3 = listenerReads('entries:normalize', createV3Head, renderV3, head => head.push(written()).patch(patched()))
    const compiled = listenerReads('entries:normalize', createHead, renderSSRHead, head => head.push(compile(written()), { loose: written }).patch(compile(patched()), { loose: patched }))
    expect(compiled).toEqual(v3)
  })

  it('is not an entry option, so the entry stays in the memo', () => {
    let calls = 0
    const head = createHead({ disableDefaults: true })
    head.push(compile(written()), {
      loose: () => {
        calls++
        return written()
      },
    })
    expect(getRenderTier(head)).toEqual({ _tag: 'Memo' })
    const v3 = createV3Head({ disableDefaults: true })
    v3.push(written())
    expect(renderSSRHead(head)).toEqual(renderV3(v3))
    expect(calls).toBe(0)
  })

  // a tag hook reads tags, and the tags of compiled tags are the tags of the input
  it('is not read for a tag hook', () => {
    let calls = 0
    const head = createHead({ disableDefaults: true })
    head.hooks.hook('tags:resolve', () => {})
    head.push(compile(written()), {
      loose: () => {
        calls++
        return written()
      },
    })
    const v3 = createV3Head({ disableDefaults: true })
    v3.push(written())
    expect(getRenderTier(head)._tag).toBe('Full')
    expect(renderSSRHead(head)).toEqual(renderV3(v3))
    expect(calls).toBe(0)
  })
})
