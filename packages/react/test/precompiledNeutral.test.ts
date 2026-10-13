// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createHead, UnheadProvider, useHead, useSeoMeta, useUnhead } from '../src/precompiled'

describe('precompiled React compile-only entry', () => {
  it('fails loudly when the target-aware transform did not run', () => {
    expect(() => createHead()).toThrow(/require experimental precompile and a target-aware build/)
    expect(() => UnheadProvider({ children: null, head: {} as never })).toThrow(/require experimental precompile and a target-aware build/)
    expect(() => useUnhead()).toThrow(/require experimental precompile and a target-aware build/)
    expect(() => useHead({ title: 'uncompiled' })).toThrow(/require experimental precompile and a target-aware build/)
    expect(() => useSeoMeta({ description: 'uncompiled' })).toThrow(/require experimental precompile and a target-aware build/)
  })
})
