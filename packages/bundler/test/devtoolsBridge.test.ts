// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'

const devtoolsClient = vi.hoisted(() => ({
  getClient: vi.fn(),
}))

vi.mock('@vitejs/devtools-kit/client', () => ({
  getDevToolsRpcClient: devtoolsClient.getClient,
}))

afterEach(() => {
  vi.useRealTimers()
  vi.resetModules()
  vi.clearAllMocks()
  delete (window as any).__unhead_devtools__
})

it('connects head state through the DevTools RPC client', async () => {
  vi.useFakeTimers()
  const getSharedState = vi.fn().mockResolvedValue({ mutate: vi.fn() })
  devtoolsClient.getClient.mockResolvedValue({
    sharedState: { get: getSharedState },
  })
  ;(window as any).__unhead_devtools__ = {
    entries: new Map([[1, {
      input: { title: 'Home' },
      _tags: [{ tag: 'title', attrs: {}, textContent: 'Home' }],
    }]]),
    hooks: { hook: vi.fn() },
  }

  await import('../src/devtools/bridge')
  await vi.advanceTimersByTimeAsync(0)

  expect(devtoolsClient.getClient).toHaveBeenCalledWith({ baseURL: '/__devtools/' })
  expect(getSharedState).toHaveBeenCalledWith('unhead:state', {
    initialValue: expect.objectContaining({
      tags: [expect.objectContaining({ tag: 'title', textContent: 'Home' })],
    }),
  })
})
