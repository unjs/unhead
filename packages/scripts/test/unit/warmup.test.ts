import type { LinkBase } from '@unhead/schema'
import { createHead as createServerHead } from 'unhead/server'
import { describe, it } from 'vitest'
import { useScript } from '../../src/useScript'

describe('warmup', () => {
  it('server', () => {
    const head = createServerHead({
      disableDefaults: true,
    })
    useScript(head, 'https://cdn.example.com/script.js', {
      head,
      trigger: 'server',
    })
    const entry = head.headEntries()[0]!.input
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
    const link = head.headEntries()[0]!.input!.link![0] as LinkBase
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
    const link = head.headEntries()[0]!.input!.link![0] as LinkBase
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
    const link = head.headEntries()[0]!.input!.link![0] as LinkBase
    expect(link.href).toEqual('https://cdn.example.com')
    expect(link.rel).toEqual('dns-prefetch')
  })
})
