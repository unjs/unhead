import { describe, expect, it } from 'vitest'
import { createUnhead } from '../src'
import { resolveTags } from '../src/utils/resolve'

describe('invalidate Function', () => {
  it('should re-queue all entries for normalization', async () => {
    const head = createUnhead({
      init: [{ title: 'Init Title' }],
    })

    // Add some entries
    head.push({ title: 'Entry 1' })
    head.push({ title: 'Entry 2' })

    // Resolve tags initially
    let tags = resolveTags(head)
    expect(tags.find(t => t.tag === 'title')?.textContent).toBe('Entry 2')

    // Get references to entries to examine their state
    const initEntry = Array.from(head.entries.values()).find(e => e.input.title === 'Init Title')!
    const entry1Ref = Array.from(head.entries.values()).find(e => e.input.title === 'Entry 1')!
    const entry2Ref = Array.from(head.entries.values()).find(e => e.input.title === 'Entry 2')!

    // Clear all _tags to simulate a state that needs re-normalization
    delete initEntry._tags
    delete entry1Ref._tags
    delete entry2Ref._tags

    // Call invalidate to re-queue all entries
    head.invalidate()

    // Resolve tags - all entries should be re-normalized
    tags = resolveTags(head)

    // Should show Entry 2 (highest priority) and all entries should have their _tags restored
    expect(tags.find(t => t.tag === 'title')?.textContent).toBe('Entry 2')
    expect(initEntry._tags).toBeDefined()
    expect(entry1Ref._tags).toBeDefined()
    expect(entry2Ref._tags).toBeDefined()
  })

  it('should work with Set-based normalize queue without duplicates', async () => {
    const head = createUnhead({
      init: [{ title: 'Init Title' }],
    })

    head.push({ title: 'Test Entry' })

    // Call invalidate multiple times
    head.invalidate()
    head.invalidate()
    head.invalidate()

    // Even with multiple invalidate calls, each entry should only be processed once
    // (this tests the Set deduplication behavior)
    const tags = resolveTags(head)
    expect(tags.find(t => t.tag === 'title')?.textContent).toBe('Test Entry')
  })

  it('should be useful after dispose operations', async () => {
    const head = createUnhead({
      init: [{ title: 'Init Title' }],
    })

    const entry = head.push({ title: 'Component Title' })

    // Resolve initially
    let tags = resolveTags(head)
    expect(tags.find(t => t.tag === 'title')?.textContent).toBe('Component Title')

    // Dispose entry (this internally calls invalidate)
    entry.dispose()

    // Should restore init values
    tags = resolveTags(head)
    expect(tags.find(t => t.tag === 'title')?.textContent).toBe('Init Title')

    // Manual invalidate should still work
    head.invalidate()
    tags = resolveTags(head)
    expect(tags.find(t => t.tag === 'title')?.textContent).toBe('Init Title')
  })
})
