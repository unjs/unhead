import { describe, expect, it } from 'vitest'
import { compileEntry } from '../packages/unhead/src/v4/compile'

function scriptContent(input: Record<string, any>) {
  return compileEntry({ script: [input] }, 1, null)[0].c
}

describe('v4 script content compilation', () => {
  it('preserves large JSON strings without less-than characters', () => {
    const payload = `{"data":"${'x'.repeat(1_100_000)}"}`
    expect(scriptContent({ type: 'application/json', textContent: payload })).toBe(payload)
  })

  it('escapes every less-than character in JSON scripts', () => {
    expect(scriptContent({ type: 'application/json', textContent: '{"x":"<tag></tag>"}' }))
      .toBe('{"x":"\\u003Ctag>\\u003C/tag>"}')
  })

  it('escapes case-insensitive closing script sequences in raw scripts', () => {
    expect(scriptContent({ innerHTML: 'a</script>b</SCRIPT>c<tag>' }))
      .toBe('a<\\/script>b<\\/script>c<tag>')
  })
})
