import type { WarmupStrategy } from '../../../src/scripts/types'
import { describe, expect, it } from 'vitest'
import { compileTags } from '../../../src/compiled'
import { createHead as createCompiledHead, renderSSRHead as renderCompiled } from '../../../src/compiled/server'
import { compileWarmup } from '../../../src/compiled/warmup'
import { useScript } from '../../../src/composables'
import { createHead as createServerHead, renderSSRHead } from '../../../src/server'

// The warmup link of the scripts.nuxt.com Gravatar script, and its variants
const CASES: [string, WarmupStrategy, Record<string, unknown>][] = [
  ['preload', 'preload', {}],
  ['preconnect', 'preconnect', {}],
  ['dns-prefetch', 'dns-prefetch', {}],
  ['preload with attributes', 'preload', { crossorigin: 'anonymous', referrerpolicy: 'no-referrer', integrity: 'sha384-x', fetchpriority: 'high' }],
]

describe('useScript warmup on a head that takes compiled tags', () => {
  it.each(CASES)('%s: renders as the full runtime head does', (_, warmupStrategy, attrs) => {
    const input = { src: 'https://secure.gravatar.com/js/gprofiles.js', ...attrs }
    const v3 = createServerHead({ disableDefaults: true })
    useScript(v3, input, { head: v3, trigger: 'manual', warmupStrategy })
    // a compiled server head is an Unhead at runtime, though its entries type differs
    const compiled: any = createCompiledHead({ disableDefaults: true })
    useScript(compiled, input, { head: compiled, trigger: 'manual', warmupStrategy })
    expect(renderCompiled(compiled)).toEqual(renderSSRHead(v3))
  })

  it.each(CASES)('%s: compileWarmup makes the tags compileTags makes', (_, warmupStrategy, attrs) => {
    const input = { src: 'https://secure.gravatar.com/js/gprofiles.js', ...attrs }
    const v3 = createServerHead({ disableDefaults: true })
    useScript(v3, input, { head: v3, trigger: 'manual', warmupStrategy })
    const [entry] = [...v3.entries.values()]
    const result = compileTags({ link: (entry!.input as any).link.map((link: object) => ({ ...link, tagPriority: 'high' })) })
    expect(result._tag).toBe('Ok')
    expect(compileWarmup(entry!.input, entry!.options)).toEqual((result as any).tags)
  })

  it.each([
    ['a boolean attribute', { link: [{ rel: 'preload', href: 'https://example.com/a.js', crossorigin: true }] }, { tagPriority: 'high' }],
    ['another priority', { link: [{ rel: 'preconnect', href: 'https://example.com' }] }, {}],
    ['another rel', { link: [{ rel: 'stylesheet', href: 'https://example.com/a.css' }] }, { tagPriority: 'high' }],
    ['another attribute', { link: [{ rel: 'preload', href: 'https://example.com/a.js', media: 'print' }] }, { tagPriority: 'high' }],
    ['two links', { link: [{ rel: 'preconnect', href: 'https://a.com' }, { rel: 'preconnect', href: 'https://b.com' }] }, { tagPriority: 'high' }],
    ['another key', { link: [{ rel: 'preconnect', href: 'https://a.com' }], title: 'x' }, { tagPriority: 'high' }],
  ] as const)('compileWarmup keeps input with %s', (_, input, options) => {
    expect(compileWarmup(input, options as any)).toBe(input)
  })
})
