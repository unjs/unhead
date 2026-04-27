import { describe, expect, it } from 'vitest'
import { extractScriptBlocks } from '../src/oxc/sfc'

describe('extractScriptBlocks', () => {
  it('extracts a basic ts script block', () => {
    const out = extractScriptBlocks(`<script lang="ts">const x = 1</script>`)
    expect(out).toHaveLength(1)
    expect(out[0].lang).toBe('ts')
    expect(out[0].code).toBe('const x = 1')
  })

  it('preserves byte offset for diagnostics', () => {
    const src = `<template><div /></template>\n<script>const a = 1</script>`
    const [block] = extractScriptBlocks(src)
    // Source index of the first char after `<script>`
    expect(src.slice(block.offset, block.offset + block.code.length)).toBe(block.code)
  })

  it('handles Vue 3.3+ generic="…<…>" attribute (> inside quoted attr)', () => {
    const src = `<script setup lang="ts" generic="T extends Record<string, unknown>">
const x: T = {} as T
</script>`
    const [block] = extractScriptBlocks(src)
    expect(block.lang).toBe('ts')
    expect(block.code).toContain('const x: T')
  })

  it('matches mixed-case </Script> closing tag (HTML is case-insensitive)', () => {
    const src = `<Script>const a = 1</Script>`
    const [block] = extractScriptBlocks(src)
    expect(block?.code).toBe('const a = 1')
  })

  it('extracts multiple script blocks (classic + setup)', () => {
    const src = `<script>const a = 1</script>\n<script setup>const b = 2</script>`
    const out = extractScriptBlocks(src)
    expect(out).toHaveLength(2)
    expect(out[0].code).toBe('const a = 1')
    expect(out[1].code).toBe('const b = 2')
  })

  it('returns empty for template-only files', () => {
    expect(extractScriptBlocks(`<template><div /></template>`)).toHaveLength(0)
  })

  it('parses unquoted lang attribute (lang=ts)', () => {
    const out = extractScriptBlocks(`<script setup lang=ts>\nconst x: number = 1\n</script>`)
    expect(out).toHaveLength(1)
    expect(out[0].lang).toBe('ts')
  })

  it('parses single-quoted lang attribute', () => {
    const out = extractScriptBlocks(`<script lang='tsx'>const x = <div/></script>`)
    expect(out).toHaveLength(1)
    expect(out[0].lang).toBe('tsx')
  })
})
