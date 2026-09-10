import { ValidatePlugin } from 'unhead/plugins'
import { createHead } from 'unhead/server'
import { renderShell } from 'unhead/stream/server'
import { describe, expect, it, vi } from 'vitest'

describe('synchronous render hook errors', () => {
  it.each([
    'tags:resolve',
    'ssr:beforeRender',
    'ssr:render',
    'ssr:rendered',
  ] as const)(
    'preserves pending entries when %s throws', (name) => {
      const head = createHead({ disableDefaults: true })
      head.push({ title: 'Retry this shell' })
      const error = new Error('Render hook failed')
      const unhook = head.hooks.hook(name, () => {
        throw error
      })

      expect(() => renderShell(head)).toThrow(error)

      unhook()
      expect(renderShell(head).headTags).toBe('<title>Retry this shell</title>')
      expect(renderShell(head).headTags).toBe('')
    },
  )

  it('propagates errors through validation without reporting an ignored promise', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const head = createHead({
      plugins: [ValidatePlugin({ onReport: () => {} })],
      hooks: { 'ssr:render': () => { throw new Error('Render hook failed') } },
    })

    expect(() => head.render()).toThrow('Render hook failed')
    expect(warn.mock.calls.filter(call => String(call[0]).includes('promise ignored'))).toEqual([])
    warn.mockRestore()
  })

  it('preserves registration order when callers await asynchronous hooks', async () => {
    const head = createHead({ disableDefaults: true })
    const calls: string[] = []
    head.hooks.hook('ssr:beforeRender', async () => {
      await Promise.resolve()
      calls.push('first')
    })
    const unhook = head.hooks.hook('ssr:beforeRender', () => {
      calls.push('removed')
    })
    head.hooks.hook('ssr:beforeRender', () => {
      calls.push('last')
    })
    unhook()

    await head.hooks.callHook('ssr:beforeRender', { shouldRender: true })

    expect(calls).toEqual(['first', 'last'])
  })
})
