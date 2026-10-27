// @vitest-environment jsdom
import type { UnheadDevtoolsState } from '../src/devtools/rpc/types'
import { afterEach, expect, it, vi } from 'vitest'
import { createHead } from '../../unhead/src/client'
import { useScript } from '../../unhead/src/scripts'

const channel = vi.hoisted(() => ({
  create: vi.fn(),
}))

vi.mock('devframe/in-page-channel', () => ({
  createPageScriptChannel: channel.create,
}))

afterEach(() => {
  vi.useRealTimers()
  vi.resetModules()
  vi.clearAllMocks()
  delete (window as any).__unhead_devtools__
  delete (window as any).__unhead_devtools_page_script__
})

function mockChannel() {
  const getSharedState = vi.fn().mockResolvedValue({ mutate: vi.fn() })
  channel.create.mockReturnValue({ sharedState: { get: getSharedState } })
  return getSharedState
}

it('publishes head state through the in-page channel', async () => {
  vi.useFakeTimers()
  const getSharedState = mockChannel()
  ;(window as any).__unhead_devtools__ = {
    entries: new Map([[1, {
      input: { title: 'Home' },
      _tags: [{ tag: 'title', props: {}, textContent: 'Home' }],
    }]]),
    hooks: { hook: vi.fn() },
  }

  const { default: setupUnheadPageScript } = await import('../src/devtools/bridge')
  setupUnheadPageScript()
  setupUnheadPageScript()
  await vi.advanceTimersByTimeAsync(0)

  expect(channel.create).toHaveBeenCalledTimes(1)
  expect(channel.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'unhead:devtools' }))
  expect(getSharedState).toHaveBeenCalledWith('state', {
    initialValue: expect.objectContaining({
      tags: [expect.objectContaining({ tag: 'title', textContent: 'Home' })],
    }),
  })
})

it('keeps the published state structured-cloneable when tag props hold functions', async () => {
  vi.useFakeTimers()
  const getSharedState = mockChannel()
  ;(window as any).__unhead_devtools__ = {
    entries: new Map([[1, {
      input: { script: [{ src: '/a.js' }] },
      _tags: [{ tag: 'script', props: { src: '/a.js', onload: function track() {} } }],
    }]]),
    hooks: { hook: vi.fn() },
  }

  const { default: setupUnheadPageScript } = await import('../src/devtools/bridge')
  setupUnheadPageScript()
  await vi.advanceTimersByTimeAsync(0)

  const { initialValue } = getSharedState.mock.calls[0]![1]
  expect(() => structuredClone(initialValue)).not.toThrow()
  expect(initialValue.tags[0].props).toEqual({ src: '/a.js', onload: 'ƒ track()' })
})

it('keeps script events mutable after initial and updated snapshots are frozen', async () => {
  vi.useFakeTimers()
  const snapshots: UnheadDevtoolsState[] = []
  function publish(state: UnheadDevtoolsState) {
    // Shared state freezes nested values when accepting a snapshot.
    for (const script of state.scripts) {
      script.events.forEach(event => Object.freeze(event))
      Object.freeze(script.events)
      Object.freeze(script)
    }
    Object.freeze(state.scripts)
    snapshots.push(Object.freeze(state))
  }
  channel.create.mockReturnValue({
    sharedState: {
      get: async (_key: string, { initialValue }: { initialValue: UnheadDevtoolsState }) => {
        publish(initialValue)
        return {
          mutate(update: (draft: UnheadDevtoolsState) => void) {
            const draft = { ...snapshots.at(-1)! }
            update(draft)
            publish(draft)
          },
        }
      },
    },
  })
  const head = createHead({ document })
  const script = useScript(head, '/devtools-script.js', { trigger: 'manual' })
  ;(window as any).__unhead_devtools__ = head
  const { default: setupUnheadPageScript } = await import('../src/devtools/bridge')
  setupUnheadPageScript()
  await vi.advanceTimersByTimeAsync(0)

  const loading = script.load()
  expect(script.status).toBe('loading')
  head.render()
  expect(snapshots.at(-1)!.scripts[0]!.events.map(event => event.type)).toEqual(['loading'])

  document.querySelector<HTMLScriptElement>('script[src="/devtools-script.js"]')!.dispatchEvent(new Event('load'))
  await vi.advanceTimersByTimeAsync(500)
  await expect(loading).resolves.toEqual({})
  expect(snapshots.at(-1)!.scripts[0]!.status).toBe('loaded')
  expect(snapshots.at(-1)!.scripts[0]!.events.map(event => event.type)).toEqual(['loading', 'loaded'])
  expect(snapshots[0]!.scripts[0]!.events).toEqual([])
  script.remove()
  head.render()
  expect(script.status).toBe('removed')
})
