import { describe, expect, it, vi } from 'vitest'
import { lazyUnheadDevtools } from '../src/devtools/lazy'

vi.mock('../src/devtools/vite', () => {
  const error = new Error('Cannot find package \'@vitejs/devtools-kit\' imported from packages/bundler/src/devtools/vite.ts')
  Object.assign(error, { code: 'ERR_MODULE_NOT_FOUND' })
  throw error
})

describe('lazyUnheadDevtools', () => {
  it('explains how to install the optional Vite DevTools packages', async () => {
    const plugin = lazyUnheadDevtools() as any

    await expect(plugin.configResolved({
      devtools: { enabled: true },
      plugins: [],
    })).rejects.toThrow(
      'Install @vitejs/devtools and @vitejs/devtools-kit to enable Unhead DevTools.',
    )
  })
})
