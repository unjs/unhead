import type { RecordedRouteHead } from 'unhead/v4/record'
import { describe, expect, it, vi } from 'vitest'
import { combineAttempts, hashPayload, toAttempt } from './head-trace'

function payload(headTags: string) {
  return { headTags, bodyTags: '', bodyTagsOpen: '', htmlAttrs: '', bodyAttrs: '' }
}

describe('hashPayload', () => {
  it('is stable for identical payloads', () => {
    expect(hashPayload(payload('<title>x</title>'))).toBe(hashPayload(payload('<title>x</title>')))
  })

  it('differs for different content', () => {
    expect(hashPayload(payload('<title>x</title>'))).not.toBe(hashPayload(payload('<title>y</title>')))
  })
})

describe('combineAttempts', () => {
  it('marks a route deterministic and runtime-omittable when both renders hash equal and there are no disqualifiers', () => {
    const recorded: RecordedRouteHead = { kind: 'dynamic', reason: 'entry 0 pushed loose input; the route head is not proven static', payload: payload('<title>About</title>') }
    const attempt = toAttempt(recorded)
    const entry = combineAttempts('/about', [attempt, toAttempt(recorded)], [])
    expect(entry.deterministic).toBe(true)
    expect(entry.runtimeOmittable).toBe(true)
    expect(entry.payload).toEqual(recorded.payload)
    expect(entry.classification).toBe('dynamic')
    expect(entry.reason).toMatch(/loose input/)
    expect(entry.hashes).toHaveLength(2)
  })

  it('marks a route non-deterministic (loudly) when the renders differ, and never ships a payload', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const first = toAttempt({ kind: 'dynamic', reason: 'loose', payload: payload('<title>1</title>') })
    const second = toAttempt({ kind: 'dynamic', reason: 'loose', payload: payload('<title>2</title>') })
    const entry = combineAttempts('/random', [first, second], [])
    expect(entry.deterministic).toBe(false)
    expect(entry.runtimeOmittable).toBe(false)
    expect(entry.payload).toBeUndefined()
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('NON-DETERMINISTIC head on route "/random"'))
    errorSpy.mockRestore()
  })

  it('checks every attempt, not just the first pair: a third divergent render still flips deterministic to false', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const a = toAttempt({ kind: 'dynamic', reason: 'loose', payload: payload('<title>x</title>') })
    const b = toAttempt({ kind: 'dynamic', reason: 'loose', payload: payload('<title>x</title>') })
    const c = toAttempt({ kind: 'dynamic', reason: 'loose', payload: payload('<title>DIFFERENT</title>') })
    const entry = combineAttempts('/flaky', [a, b, c], [])
    expect(entry.deterministic).toBe(false)
    expect(entry.hashes).toHaveLength(3)
    errorSpy.mockRestore()
  })

  it('disqualifies a deterministic route when a client-only useHead is found, loudly, and withholds the payload', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const recorded: RecordedRouteHead = { kind: 'dynamic', reason: 'loose', payload: payload('<title>Trap</title>') }
    const attempt = toAttempt(recorded)
    const entry = combineAttempts('/trap', [attempt, toAttempt(recorded)], ['useHead() at trap.vue:9 runs inside onMounted(); invisible to SSR recording'])
    expect(entry.deterministic).toBe(true)
    expect(entry.runtimeOmittable).toBe(false)
    expect(entry.payload).toBeUndefined()
    expect(entry.disqualifiers).toHaveLength(1)
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('disqualified from runtime omission'))
    errorSpy.mockRestore()
  })

  it('propagates recordRouteHead\'s static kind through classification without inventing a stronger claim', () => {
    const recorded: RecordedRouteHead = { kind: 'static', payload: payload('<title>Sealed</title>'), entries: 2 }
    const attempt = toAttempt(recorded)
    const entry = combineAttempts('/sealed', [attempt, toAttempt(recorded)], [])
    expect(entry.classification).toBe('static')
    expect(entry.reason).toBeUndefined()
    expect(entry.runtimeOmittable).toBe(true)
  })

  it('refuses to run on fewer than 2 attempts: determinism cannot be proven from one render', () => {
    const attempt = toAttempt({ kind: 'dynamic', reason: 'loose', payload: payload('<title>x</title>') })
    expect(() => combineAttempts('/one', [attempt], [])).toThrow(/at least 2 renders/)
  })
})
