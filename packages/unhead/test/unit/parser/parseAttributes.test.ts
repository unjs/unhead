import { describe, expect, it } from 'vitest'
import { parseAttributes } from '../../../src/parser'

describe('parseAttributes', () => {
  it('treats backslash as a literal char in quoted values', () => {
    expect(parseAttributes('href="C:\\"')).toEqual({ href: 'C:\\' })
  })

  it('does not let a backslash swallow the closing quote', () => {
    expect(parseAttributes('content="a\\" name="description"')).toEqual({
      content: 'a\\',
      name: 'description',
    })
  })

  it('preserves the first duplicate attribute', () => {
    expect(parseAttributes('type="application/json" type="text/javascript"')).toEqual({
      type: 'application/json',
    })
  })
})
