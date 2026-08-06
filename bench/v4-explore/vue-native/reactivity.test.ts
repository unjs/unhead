// @vitest-environment jsdom
/**
 * Candidate 4: vue reactivity as the invalidation layer for the vue adapter.
 * Core stays framework-free; the client already exposes a scheduler seam
 * (CreateClientHeadOptions.scheduler), so the question is what vue's
 * effect()/nextTick actually replace and what glue they add.
 */
import { describe, expect, it } from 'vitest'
import { effect, nextTick, shallowRef } from 'vue'
import { attachDom, createHead as createClientHead } from '../../../packages/unhead/src/v4/client'
import { compileEntry, TitlePlugin } from '../../../packages/unhead/src/v4/compile'
import { createCore } from '../../../packages/unhead/src/v4/core'

describe('scheduler seam filled with vue nextTick', () => {
  it('aligns head flushes with vue microtask timing, zero extra glue', async () => {
    document.head.innerHTML = ''
    const head = createClientHead({ document, scheduler: flush => nextTick(flush) })
    head.push({ title: 'A', meta: [{ name: 'description', content: 'x' }] })
    expect(document.title).not.toBe('A') // not yet flushed
    await nextTick()
    expect(document.title).toBe('A')
    expect(document.head.querySelector('meta[name=description]')).toBeTruthy()
  })
})

describe('effect()-driven renders (dirty ref replaces the scheduled flag)', () => {
  it('works, batches multiple pushes into one render, but only replaces ~5 lines of core plumbing', async () => {
    document.head.innerHTML = ''
    const core = createCore({ ssr: false, compile: compileEntry })
    // scheduler seam muted: vue's effect drives flushes instead
    const head = attachDom(core, { document, scheduler: () => {} })
    head.use(TitlePlugin)

    // the replacement: dirty flag -> shallowRef, microtask dedupe -> effect
    // scheduler + nextTick
    const tick = shallowRef(0)
    let renders = 0
    let queued = false
    const runner = effect(
      () => {
        void tick.value
        if (head.dirty) {
          renders++
          head.render()
        }
      },
      {
        scheduler: () => {
          if (!queued) {
            queued = true
            nextTick(() => {
              queued = false
              runner()
            })
          }
        },
      },
    )
    // the glue that does NOT go away: push/patch/dispose still need wrapping
    // to bump the ref, exactly like they already wrap invalidate()
    const push = head.push.bind(head)
    head.push = (input, opts) => {
      const e = push(input, opts)
      tick.value++
      return {
        patch: (n: unknown, f?: unknown[]) => {
          e.patch(n, f)
          tick.value++
        },
        dispose: () => {
          e.dispose()
          tick.value++
        },
      }
    }

    const a = head.push({ title: 'One' })
    head.push({ meta: [{ name: 'description', content: 'd' }] })
    await nextTick()
    expect(document.title).toBe('One')
    expect(renders).toBe(1) // batched

    a.patch({ title: 'Two' })
    await nextTick()
    expect(document.title).toBe('Two')
    expect(renders).toBe(2)
  })
})
