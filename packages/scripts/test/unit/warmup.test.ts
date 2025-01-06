import type { LinkBase } from 'zhead'
import { createHead } from 'unhead'
import { describe, it } from 'vitest'
import { useScript } from '../../src/vanilla/useScript'

describe('warmup', () => {
  it('server', () => {
    const head = createHead()
    useScript('https://cdn.example.com/script.js', {
      head,
      trigger: 'server',
    })
    const entry = head.headEntries()[0]!.input
    expect(entry.script[0].src).toBe('https://cdn.example.com/script.js')
    expect(entry.link).toBeUndefined()
  })
  it('default / client', () => {
    const head = createHead()
    useScript('https://cdn.example.com/script.js', {
      head,
      trigger: 'client',
    })
    const link = head.headEntries()[0]!.input!.link![0] as LinkBase
    expect(link.href).toEqual('https://cdn.example.com/script.js')
    expect(link.rel).toEqual('preload')
  })
  it('relative: default / client', () => {
    const head = createHead()
    useScript('/script.js', {
      head,
      trigger: 'client',
    })
    const link = head.headEntries()[0]!.input!.link![0] as LinkBase
    expect(link.href).toEqual('/script.js')
    expect(link.rel).toEqual('preload')
  })
  it('absolute: dns-prefetch', () => {
    const head = createHead()
    useScript('https://cdn.example.com/script.js', {
      head,
      trigger: 'client',
      warmupStrategy: 'dns-prefetch',
    })
    const link = head.headEntries()[0]!.input!.link![0] as LinkBase
    expect(link.href).toEqual('https://cdn.example.com')
    expect(link.rel).toEqual('dns-prefetch')
  })
})
