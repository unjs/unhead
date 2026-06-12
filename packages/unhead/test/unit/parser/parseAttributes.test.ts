import { describe, expect, it } from 'vitest'
import { parseAttributes } from '../../../src/parser'

describe('parseAttributes', () => {
  it('treats backslash as a literal char in quoted values', () => {
    // HTML has no backslash escaping in attribute values, so a trailing
    // backslash must not consume the closing quote.
    expect(parseAttributes('href="C:\\"')).toEqual({ href: 'C:\\' })
  })

  it('does not let a backslash swallow the closing quote of an attribute', () => {
    expect(parseAttributes('content="a\\" name="description"')).toEqual({
      content: 'a\\',
      name: 'description',
    })
  })

  it('parses basic quoted and unquoted attributes', () => {
    expect(parseAttributes('name="description" content=hello disabled')).toEqual({
      name: 'description',
      content: 'hello',
      disabled: '',
    })
  })
})
