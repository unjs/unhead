// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'

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
      _tags: [{ tag: 'title', attrs: {}, textContent: 'Home' }],
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
