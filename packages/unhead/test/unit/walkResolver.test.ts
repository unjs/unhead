import { renderSSRHead } from '../../src/server'
import { createHead } from '../../src/server/createHead'
import { resolveHeadInput } from '../../src/utils/normalize'
import { walkResolver } from '../../src/utils/walkResolver'

describe('walkResolver cycle detection', () => {
  it('throws for an object referencing itself', () => {
    const input: any = { title: 'x' }
    input.self = input
    expect(() => walkResolver(input)).toThrowError(/\[unhead\] Circular reference detected in head input at key "self"/)
  })

  it('throws for a cycle through nested keys', () => {
    const input: any = { meta: [{ name: 'a' }] }
    input.meta[0].root = input
    expect(() => walkResolver(input)).toThrowError(/\[unhead\] Circular reference detected/)
  })

  it('throws for an array containing itself', () => {
    const input: any = { script: [] }
    input.script.push(input.script)
    expect(() => walkResolver(input)).toThrowError(/\[unhead\] Circular reference detected/)
  })

  it('allows the same object as siblings, not ancestors', () => {
    const shared = { rel: 'icon', href: '/favicon.ico' }
    const input = { link: [shared, shared], meta: [shared] }
    expect(walkResolver(input)).toBe(input)
  })

  it('keeps structural sharing for unchanged input', () => {
    const tag = { name: 'description', content: 'x' }
    const input = { meta: [tag] }
    expect(walkResolver(input)).toBe(input)
  })

  it('reports the key the cycle was entered through', () => {
    const input: any = {}
    input.innerHTML = input
    try {
      walkResolver(input)
      expect.unreachable()
    }
    catch (error) {
      expect((error as Error).message).toContain('at key "innerHTML"')
    }
  })

  it('throws through resolveHeadInput with a resolver present', () => {
    const input: any = { title: () => 'x' }
    input.cycle = input
    const resolver = (key: string | undefined, value: any) => value
    expect(() => resolveHeadInput(input, [resolver])).toThrowError(/\[unhead\] Circular reference detected/)
  })

  it('surfaces as a clean error from an SSR render, not a stack overflow', () => {
    const circular: any = { name: 'loop' }
    circular.self = circular
    const head = createHead()
    head.push({ script: [{ type: 'application/ld+json', innerHTML: circular }] })
    expect(() => renderSSRHead(head)).toThrowError(/\[unhead\] Circular reference detected in head input at key "self"/)
  })
})
