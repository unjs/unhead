import { describe, expect, it, vi } from 'vitest'
import { resolveParser, resolveParserOrThrow, resolveRawTransferParser } from '../src/unplugin/parser'

const parseSync = vi.fn()

describe('resolveRawTransferParser', () => {
  it('wraps parseSync to enable raw transfer when supported', () => {
    const parseSync = vi.fn()
    const load = vi.fn(() => ({
      _tag: 'ok' as const,
      module: { parseSync, rawTransferSupported: () => true },
    }))

    const resolved = resolveRawTransferParser(load)!
    resolved.parseSync('x.js', 'const x = 1', { lang: 'js' })

    expect(load).toHaveBeenCalledWith('oxc-parser')
    expect(parseSync).toHaveBeenCalledWith('x.js', 'const x = 1', expect.objectContaining({ lang: 'js', experimentalRawTransfer: true }))
  })

  it('returns undefined when raw transfer is unavailable', () => {
    expect(resolveRawTransferParser(() => ({ _tag: 'error' as const, cause: new Error('oxc-parser is not installed') }))).toBeUndefined()
    expect(resolveRawTransferParser(() => ({ _tag: 'ok' as const, module: { parseSync: vi.fn(), rawTransferSupported: () => false } }))).toBeUndefined()
    expect(resolveRawTransferParser(() => ({ _tag: 'ok' as const, module: { rawTransferSupported: () => true } }))).toBeUndefined()
  })
})

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
