// @vitest-environment jsdom
import { createRoot } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { useHead, useHeadSafe, useSeoMeta } from '../src'
import { createHead } from '../src/client'

describe('solid head lifecycle', () => {
  it('disposes head entries with their owner', () => {
    const head = createHead()
    let dispose!: () => void

    createRoot((rootDispose) => {
      dispose = rootDispose
      useHead({ title: 'Head' }, { head })
      useHeadSafe({ meta: [{ name: 'safe', content: 'value' }] }, { head })
      useSeoMeta({ description: 'description' }, { head })
    })

    expect(head.entries.size).toBe(3)
    dispose()
    expect(head.entries.size).toBe(0)
  })
})
