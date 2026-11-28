import type { MockInstance } from 'vitest'
import { ValidatePlugin } from 'unhead/plugins'
import { createHead, renderSSRHead } from 'unhead/server'
import { describe, expect, it, vi } from 'vitest'

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

  it('does not warn for synchronous tag hooks', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const head = createHead({
      plugins: [ValidatePlugin({ onReport: () => {} })],
      hooks: {
        'entries:normalize': () => {},
        'tags:beforeResolve': () => {},
        'tags:resolve': () => {},
        'tags:afterResolve': () => {},
        'ssr:render': () => {},
      },
    })
    head.push({ title: 'Synchronous hooks' })

    expect(renderSSRHead(head).headTags).toContain('<title>Synchronous hooks</title>')
    expect(asyncWarnings(warn)).toHaveLength(0)
    warn.mockRestore()
  })

  it.each(['entries:normalize', 'tags:beforeResolve', 'tags:resolve', 'tags:afterResolve', 'ssr:render'] as const)('warns once when a %s hook returns a promise', (hook) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const head = createHead({
      plugins: [ValidatePlugin({ onReport: () => {} })],
      hooks: {
        [hook]: async () => {},
      },
    })
    head.push({ title: 'Async hook diagnostics' })

    renderSSRHead(head)
    renderSSRHead(head)

    expect(asyncWarnings(warn)).toHaveLength(1)
    expect(asyncWarnings(warn)[0][0]).toContain(hook)
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
