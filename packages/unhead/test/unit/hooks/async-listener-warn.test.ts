import { describe, expect, it, vi } from 'vitest'
import { createHead, renderSSRHead } from '../../../src/server'

describe('async hook listeners on the sync pipeline', () => {
  it('warns once when a listener returns a promise', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const head = createHead({
      hooks: {
        'tags:resolve': async () => {
          await Promise.resolve()
        },
      },
    })
    head.push({ title: 'first' })
    renderSSRHead(head)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('tags:resolve')
    // one-time warning: a second render doesn't warn again
    renderSSRHead(head)
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})
