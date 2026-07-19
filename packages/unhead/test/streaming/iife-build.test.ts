import { describe, expect, it } from 'vitest'
import { serializeIifeCode } from '../../build.config'

describe('streaming IIFE build', () => {
  it('hides Rollup transform tokens without changing the code', () => {
    const code = 'const win = typeof window !== "undefined"; process.env.NODE_ENV; Buffer'
    const serialized = serializeIifeCode(code)

    expect(serialized).not.toContain('typeof window')
    expect(serialized).not.toContain('process')
    expect(serialized).not.toContain('Buffer')

    expect(JSON.parse(serialized)).toBe(code)
  })
})
