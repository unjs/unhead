import { describe, expect, it, vi } from 'vitest'
import { createDebouncedFn } from '../../../src/client'

describe('createDebouncedFn', () => {
  it('should debounce the function calls', async () => {
    const callee = vi.fn()
    const delayer = vi.fn((fn: () => void) => setTimeout(fn, 50))
    const debouncedFn = createDebouncedFn(callee, delayer)

    // Call the debounced function multiple times
    debouncedFn()
    debouncedFn()
    debouncedFn()

    // Ensure the delayer function was called only once
    expect(delayer).toHaveBeenCalledTimes(3)
    expect(callee).toHaveBeenCalledTimes(0)

    // Wait for the debounced function to execute
    await new Promise(resolve => setTimeout(resolve, 45))

    // this resets the timer
    debouncedFn()

    await new Promise(resolve => setTimeout(resolve, 45))

    // Ensure the callee function was called only once
    expect(callee).toHaveBeenCalledTimes(0)

    await new Promise(resolve => setTimeout(resolve, 25))

    expect(callee).toHaveBeenCalledTimes(1)
  })
})
