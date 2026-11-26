import { describe, expect, it, vi } from 'vitest'
import { parseAndWalkSource } from '../src/unplugin/parser'

describe('raw transfer fallback', () => {
  it('falls back to the JSON parse path when raw transfer cannot allocate its buffer and stops retrying', () => {
    let allocationFailure = false
    const rawParseSync = vi.fn(() => {
      if (allocationFailure)
        throw new RangeError('Array buffer allocation failed')
      throw new RangeError('Maximum call stack size exceeded')
    })
    const load = vi.fn(() => ({
      _tag: 'ok' as const,
      module: { parseSync: rawParseSync, rawTransferSupported: () => true },
    }))

    const visited: string[] = []
    const code = 'const x = 1'
    const options = {
      parseOptions: { lang: 'js' as const },
      enter(node: any) {
        if (node.type === 'VariableDeclarator')
          visited.push(node.id.name)
      },
    }

    // A non-allocation error is rethrown and raw transfer stays enabled.
    expect(() => parseAndWalkSource(code, 'x.js', options, load)).toThrow(
      new RangeError('Maximum call stack size exceeded'),
    )
    expect(rawParseSync).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledTimes(1)

    allocationFailure = true
    expect(() => parseAndWalkSource(code, 'x.js', options, load)).not.toThrow()
    expect(visited).toEqual(['x'])
    expect(rawParseSync).toHaveBeenCalledTimes(2)
    expect(load).toHaveBeenCalledTimes(1)

    // Raw transfer is disabled for the rest of the process.
    expect(() => parseAndWalkSource(code, 'x.js', options, load)).not.toThrow()
    expect(visited).toEqual(['x', 'x'])
    expect(rawParseSync).toHaveBeenCalledTimes(2)
    expect(load).toHaveBeenCalledTimes(1)
  })
})
