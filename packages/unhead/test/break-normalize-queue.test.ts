import { describe, expect, it } from 'vitest'
import { createUnhead } from '../src'

describe('break Normalize Queue - Replicate Bug', () => {
  it('replicates the bug by following React pattern exactly', async () => {
    // First, let me revert the fix to test the original buggy behavior
    const head = createUnhead({
      init: [{ title: 'Init Title', meta: [{ name: 'description', content: 'Init description' }] }],
    })

    // Step 1: Initial state - init values should be normalized
    let tags = head.resolveTags()
    expect(tags.find(t => t.tag === 'title')?.textContent).toBe('Init Title')

    // Step 2: Component mounts - React creates entry via push()
    const componentEntry = head.push({
      title: 'Component Title',
      meta: [{ name: 'description', content: 'Component description' }],
    })

    // Step 3: Component patches entry (React does this on every render/prop change)
    componentEntry.patch({
      title: 'Component Title',
      meta: [{ name: 'description', content: 'Component description' }],
    })

    // Step 4: Resolve tags - component values should be active
    tags = head.resolveTags()
    expect(tags.find(t => t.tag === 'title')?.textContent).toBe('Component Title')

    // Step 5: Component unmounts - React calls dispose()
    // This is where the bug happens: dispose() calls _._poll(true)
    // which means !rm is false, so remaining entries don't get added to normalizeQueue
    componentEntry.dispose()

    // Step 6: The bug manifests here
    // Without the fix, init entries won't be in normalizeQueue
    // so they won't be normalized and their _tags might be stale
    tags = head.resolveTags()

    // This should pass but may fail with the original buggy code
    expect(tags.find(t => t.tag === 'title')?.textContent).toBe('Init Title')
    expect(tags.find(t => t.tag === 'meta' && t.props.name === 'description')?.props.content).toBe('Init description')
  })

  it('breaks the normalize queue by examining internal state', async () => {
    const head = createUnhead({
      init: [{ title: 'Init Title' }],
    })

    // Get reference to the init entry to examine its internal state
    const initEntry = Array.from(head.entries.values())[0]

    // First resolution - init entry gets normalized
    head.resolveTags()
    const originalTags = initEntry._tags
    expect(originalTags).toBeDefined()
    expect(originalTags?.[0]?.textContent).toBe('Init Title')

    // Add component entry
    const componentEntry = head.push({ title: 'Component Title' })

    // Resolve - both entries get normalized
    head.resolveTags()

    // Dispose component entry
    componentEntry.dispose()

    // The bug: after disposal, if normalizeQueue is empty,
    // init entry won't be re-normalized even if its _tags are stale

    // Let's check if init entry is in the normalize queue after disposal
    // We can't access normalizeQueue directly, but we can infer by checking
    // if the init entry gets re-normalized

    // Force a scenario where init entry needs re-normalization
    // by modifying its input directly (simulating what might happen in complex scenarios)
    const tags = head.resolveTags()

    // If the bug exists, this might fail because init entry didn't get normalized
    expect(tags.find(t => t.tag === 'title')?.textContent).toBe('Init Title')
  })

  it('exposes the bug through normalize queue manipulation', async () => {
    const head = createUnhead({
      init: [{ title: 'Init Title' }],
    })

    // Create a scenario where the normalize queue state matters

    // Step 1: Add component entry and resolve
    const componentEntry = head.push({ title: 'Component Title' })
    head.resolveTags() // This processes and clears the normalize queue

    // Step 2: Manually trigger a state that requires re-normalization
    // In a real scenario, this might happen due to plugins or other factors
    const initEntry = Array.from(head.entries.values())[0]

    // Clear the init entry's _tags to simulate needing re-normalization
    delete initEntry._tags

    // Step 3: Dispose component entry
    componentEntry.dispose()

    // Step 4: The bug - if dispose() doesn't add remaining entries to normalizeQueue,
    // the init entry won't be normalized because its _tags is undefined
    const tags = head.resolveTags()

    // This should work but might fail if normalize queue bug exists
    expect(tags.find(t => t.tag === 'title')?.textContent).toBe('Init Title')
  })

  it('replicates React strict mode double disposal pattern', async () => {
    const head = createUnhead({
      init: [{ title: 'Init Title' }],
    })

    // React Strict Mode pattern: mount → unmount → mount → unmount

    // First mount
    const entry1 = head.push({ title: 'Component Title 1' })
    head.resolveTags()

    // First unmount (Strict Mode)
    entry1.dispose()

    // Second mount (Strict Mode remount)
    const entry2 = head.push({ title: 'Component Title 2' })
    head.resolveTags()

    // Second unmount (actual unmount)
    entry2.dispose()

    // Multiple disposals might expose the normalize queue bug
    const tags = head.resolveTags()
    expect(tags.find(t => t.tag === 'title')?.textContent).toBe('Init Title')
  })
})
