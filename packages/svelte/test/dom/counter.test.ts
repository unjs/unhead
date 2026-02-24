// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/svelte'
import { beforeEach, describe, expect, it } from 'vitest'
import { createHead, UnheadContextKey } from '../../src/client'
import Counter from '../fixtures/Counter.svelte'

describe('svelte Unhead', () => {
  beforeEach(() => {
    cleanup()
    // Reset dom
    document.head.innerHTML = ''
  })

  it('should update title when counter changes', async () => {
    const head = createHead()
    const context = new Map()
    context.set(UnheadContextKey, head)
    render(Counter, { context })

    expect(head.entries.size).toBe(1)

    await new Promise(r => setTimeout(r, 10))

    expect(document.title).toBe('Count is 0')

    // trigger counter increment
    document.querySelector('button')?.click()

    await new Promise(r => setTimeout(r, 10))

    expect(document.title).toBe('Count is 1')
  })

  it('should handle rapid updates', async () => {
    const head = createHead()
    const context = new Map()
    context.set(UnheadContextKey, head)
    const { container } = render(Counter, { context })

    const button = container.querySelector('button')!

    // Rapid clicks
    for (let i = 0; i < 10; i++)
      button.click()

    await new Promise(r => setTimeout(r, 10))
    expect(document.title).toBe('Count is 10')
    expect(head.entries.size).toBe(1) // Should maintain single entry
  })

  it('should cleanup on unmount', async () => {
    const head = createHead()
    const context = new Map()
    context.set(UnheadContextKey, head)
    const { unmount } = render(Counter, { context })

    await new Promise(r => setTimeout(r, 10))
    expect(head.entries.size).toBe(1)

    unmount()
    expect(head.entries.size).toBe(0)
  })

  it('should handle multiple counters', async () => {
    const head = createHead()
    const context = new Map()
    context.set(UnheadContextKey, head)

    const { container: counter1 } = render(Counter, { context })
    const { container: counter2 } = render(Counter, { context })

    await new Promise(r => setTimeout(r, 10))
    expect(head.entries.size).toBe(2)

    counter1.querySelector('button')?.click()
    await new Promise(r => setTimeout(r, 10))
    // counter 2 has priority as it was mounted last
    expect(document.title).toBe('Count is 0')

    counter2.querySelector('button')?.click()
    await new Promise(r => setTimeout(r, 10))
    expect(document.title).toBe('Count is 1')
  })

  it('should handle component remount', async () => {
    const head = createHead()
    const context = new Map()
    context.set(UnheadContextKey, head)

    const { unmount } = render(Counter, { context })
    await new Promise(r => setTimeout(r, 10))
    unmount()

    render(Counter, { context })
    await new Promise(r => setTimeout(r, 10))
    expect(head.entries.size).toBe(1)
    expect(document.title).toBe('Count is 0')
  })

  it('should handle invalid head context', () => {
    const context = new Map()
    expect(() => render(Counter, { context }))
      .toThrow()
  })
})
