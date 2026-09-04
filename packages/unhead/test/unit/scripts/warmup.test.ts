import type { GenericLink } from '../../../src/types'
import { describe, it } from 'vitest'
import { useScript } from '../../../src/composables'
import { createHead as createServerHead } from '../../../src/server'

describe('warmup', () => {
  it('server', () => {
    const head = createServerHead({
      disableDefaults: true,
    })
    useScript(head, 'https://cdn.example.com/script.js', {
      head,
      trigger: 'server',
    })
    const entry = [...head.entries.values()][0]!.input
    // @ts-expect-error untyped
    expect(entry.script[0].src).toBe('https://cdn.example.com/script.js')
    expect(entry.link).toBeUndefined()
  })
  it('default / client', () => {
    const head = createServerHead({
      disableDefaults: true,
    })
    useScript(head, 'https://cdn.example.com/script.js', {
      head,
      trigger: 'client',
    })
    // @ts-expect-error untyped
    const link = [...head.entries.values()][0]!.input!.link![0] as GenericLink
    expect(link.href).toEqual('https://cdn.example.com/script.js')
    expect(link.rel).toEqual('preload')
  })
  it('relative: default / client', () => {
    const head = createServerHead({
      disableDefaults: true,
    })
    useScript(head, '/script.js', {
      head,
      trigger: 'client',
    })
    // @ts-expect-error untyped
    const link = [...head.entries.values()][0]!.input!.link![0] as GenericLink
    expect(link.href).toEqual('/script.js')
    expect(link.rel).toEqual('preload')
  })
  it('absolute: dns-prefetch', () => {
    const head = createServerHead({
      disableDefaults: true,
    })
    useScript(head, 'https://cdn.example.com/script.js', {
      head,
      trigger: 'client',
      warmupStrategy: 'dns-prefetch',
    })
    // @ts-expect-error untyped
    const link = [...head.entries.values()][0]!.input!.link![0] as GenericLink
    expect(link.href).toEqual('https://cdn.example.com')
    expect(link.rel).toEqual('dns-prefetch')
  })

  it('skips origin-only warmups for document-relative sources', () => {
    const head = createServerHead({
      disableDefaults: true,
    })

    expect(() => useScript(head, 'script.js', {
      trigger: 'manual',
      warmupStrategy: 'preconnect',
    })).not.toThrow()
    expect([...head.entries.values()]).toHaveLength(0)
  })

  it('supports protocol-relative sources for origin-only warmups', () => {
    const head = createServerHead({
      disableDefaults: true,
    })

    expect(() => useScript(head, '//cdn.example.com/script.js', {
      trigger: 'manual',
      warmupStrategy: 'preconnect',
    })).not.toThrow()

    // @ts-expect-error untyped
    const link = [...head.entries.values()][0]!.input!.link![0] as GenericLink
    expect(link.href).toEqual('//cdn.example.com')
    expect(link.rel).toEqual('preconnect')
  })

  it.each([
    ['//cdn.example.com\\script.js', '//cdn.example.com'],
    ['//cdn.example.com\\@evil.example/script.js', '//cdn.example.com'],
    ['///script.js', '//script.js'],
  ])('uses browser URL parsing for protocol-relative source %s', (src, expectedHref) => {
    const head = createServerHead({
      disableDefaults: true,
    })

    expect(() => useScript(head, src, {
      trigger: 'manual',
      warmupStrategy: 'preconnect',
    })).not.toThrow()

    // @ts-expect-error untyped
    const link = [...head.entries.values()][0]!.input!.link![0] as GenericLink
    expect(link.href).toEqual(expectedHref)
  })

  it('preserves explicit ports in protocol-relative origin warmups', () => {
    const head = createServerHead({
      disableDefaults: true,
    })

    useScript(head, '//cdn.example.com:443/script.js', {
      trigger: 'manual',
      warmupStrategy: 'preconnect',
    })

    // @ts-expect-error untyped
    const link = [...head.entries.values()][0]!.input!.link![0] as GenericLink
    expect(link.href).toEqual('//cdn.example.com:443')
  })
})
