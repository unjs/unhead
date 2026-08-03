import { describe, expect, it, vi } from 'vitest'
import { resolveParser, resolveParserOrThrow } from '../src/unplugin/parser'

const parseSync = vi.fn()

describe('resolveParser', () => {
  it('prefers the parser already shipped by Rolldown', () => {
    const load = vi.fn(id => ({
      _tag: 'ok' as const,
      module: { parseSync: id === 'rolldown/utils' ? parseSync : vi.fn() },
    }))

    expect(resolveParser(load)).toEqual({
      _tag: 'ok',
      id: 'rolldown/utils',
      parseSync,
    })
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('falls back to oxc-parser', () => {
    const rolldownError = new Error('rolldown is not installed')
    const load = vi.fn(id => id === 'rolldown/utils'
      ? { _tag: 'error' as const, cause: rolldownError }
      : { _tag: 'ok' as const, module: { parseSync } })

    expect(resolveParser(load)).toEqual({
      _tag: 'ok',
      id: 'oxc-parser',
      parseSync,
    })
  })

  it('returns each load failure when neither parser is available', () => {
    const load = vi.fn(id => ({
      _tag: 'error' as const,
      cause: new Error(`${id} is not installed`),
    }))

    const result = resolveParser(load)

    expect(result._tag).toBe('missing')
    if (result._tag === 'missing')
      expect(result.failures.map(failure => failure.id)).toEqual(['rolldown/utils', 'oxc-parser'])
  })

  it('explains how to install the fallback when neither parser is available', () => {
    const load = vi.fn(id => ({
      _tag: 'error' as const,
      cause: new Error(`${id} is not installed`),
    }))

    expect(() => resolveParserOrThrow(load)).toThrowError(
      'Unhead build transforms require a parser. Rolldown is detected automatically. If Rolldown is unavailable, install oxc-parser as a development dependency.',
    )

    try {
      resolveParserOrThrow(load)
    }
    catch (error) {
      expect(error).toMatchObject({
        _tag: 'MissingParserError',
        cause: expect.any(AggregateError),
      })
    }
  })
})
