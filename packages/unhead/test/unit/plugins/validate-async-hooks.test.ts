import type { MockInstance } from 'vitest'
import { describe, expect, it, vi } from 'vitest'
import { ValidatePlugin } from '../../../src/plugins'
import { createHead, renderSSRHead } from '../../../src/server'

function asyncWarnings(warn: MockInstance<typeof console.warn>) {
  return warn.mock.calls.filter(call => String(call[0]).includes('promise ignored'))
}

describe('validatePlugin async hook diagnostics', () => {
  it('does not warn without the validation plugin', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const head = createHead({
      hooks: {
        'tags:resolve': async () => {},
      },
    })

    renderSSRHead(head)

    expect(asyncWarnings(warn)).toHaveLength(0)
    warn.mockRestore()
  })

  it('warns once when a hook returns a promise', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const head = createHead({
      plugins: [ValidatePlugin({ onReport: () => {} })],
      hooks: {
        'tags:resolve': async () => {},
      },
    })

    renderSSRHead(head)
    renderSSRHead(head)

    expect(asyncWarnings(warn)).toHaveLength(1)
    expect(asyncWarnings(warn)[0][0]).toContain('tags:resolve')
    warn.mockRestore()
  })

  it('deduplicates the warning per head instance', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const options = {
      plugins: [ValidatePlugin({ onReport: () => {} })],
      hooks: {
        'tags:resolve': async () => {},
      },
    }

    renderSSRHead(createHead(options))
    renderSSRHead(createHead(options))

    expect(asyncWarnings(warn)).toHaveLength(2)
    warn.mockRestore()
  })
})
