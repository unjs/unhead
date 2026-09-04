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

  it.each([
    'http:cdn.example/x.js',
    'http:/cdn.example/x.js',
    'http:\\cdn.example/x.js',
    'https:cdn.example/x.js',
    'https:/cdn.example/x.js',
    'https:\\cdn.example/x.js',
  ])('skips origin-only warmups when source %s depends on the document scheme', (src) => {
    for (const warmupStrategy of ['preconnect', 'dns-prefetch'] as const) {
      const head = createServerHead({
        disableDefaults: true,
      })

      useScript(head, src, {
        trigger: 'manual',
        warmupStrategy,
      })

      expect([...head.entries.values()]).toHaveLength(0)
    }
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

  it.each([
    ['//cdn.example.com/script.js', '//cdn.example.com'],
    ['//cdn.example.com:80/script.js', '//cdn.example.com:80'],
    ['//cdn.example.com:443/script.js', '//cdn.example.com:443'],
    ['//cdn.example.com:8080/script.js', '//cdn.example.com:8080'],
  ])('preserves the port in protocol-relative origin warmup %s', (src, expectedHref) => {
    const head = createServerHead({
      disableDefaults: true,
    })

    useScript(head, src, {
      trigger: 'manual',
      warmupStrategy: 'preconnect',
    })

    // @ts-expect-error untyped
    const link = [...head.entries.values()][0]!.input!.link![0] as GenericLink
    expect(link.href).toEqual(expectedHref)
  })

  it.each([
    ['http://cdn.example.com/script.js', 'http://cdn.example.com'],
    [' https://cdn.example.com/script.js ', 'https://cdn.example.com'],
    [' //cdn.example.com/script.js ', '//cdn.example.com'],
    ['http:\\\\cdn.example.com/script.js', 'http://cdn.example.com'],
    ['https:\\\\cdn.example.com/script.js', 'https://cdn.example.com'],
  ])('uses the parsed HTTP origin for source %s', (src, expectedHref) => {
    const head = createServerHead({
      disableDefaults: true,
    })

    useScript(head, src, {
      trigger: 'manual',
      warmupStrategy: 'preconnect',
    })

    // @ts-expect-error untyped
    const link = [...head.entries.values()][0]!.input!.link![0] as GenericLink
    expect(link.href).toEqual(expectedHref)
  })

  it.each([
    ' https://cdn.example.com/script.js ',
    ' //cdn.example.com/script.js ',
    'https:\\\\cdn.example.com/script.js',
  ])('adds cross-origin privacy defaults for preload source %s', (src) => {
    const head = createServerHead({
      disableDefaults: true,
    })

    useScript(head, src, {
      head,
      trigger: 'client',
    })

    // @ts-expect-error untyped
    const link = [...head.entries.values()][0]!.input!.link![0] as GenericLink
    expect(link.crossorigin).toEqual('anonymous')
    expect(link.referrerpolicy).toEqual('no-referrer')
  })
})
