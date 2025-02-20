// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHead, UnheadContextKey } from '../../src/client'
import ScriptLoading from '../fixtures/ScriptLoading.svelte'
import ScriptProxy from '../fixtures/ScriptProxy.svelte'

describe('svelte useScript', () => {
  beforeEach(() => {
    cleanup()
    document.head.innerHTML = ''
  })

  it('should handle script loading with trigger', async () => {
    const head = createHead()
    const context = new Map()
    context.set(UnheadContextKey, head)
    const { container } = render(ScriptLoading, {
      context,
      props: {
        trigger: 'click',
        src: 'https://cdn.jsdelivr.net/npm/confetti-js@0.0.18/dist/index.min.js',
      },
    })

    await new Promise(r => setTimeout(r, 10))

    expect(document.querySelector('script[src]')).toBeFalsy()

    container.querySelector('button')?.click()
    await new Promise(r => setTimeout(r, 10))

    const script = document.querySelector('script[src="https://cdn.jsdelivr.net/npm/confetti-js@0.0.18/dist/index.min.js"]')
    expect(script).toBeTruthy()
    expect(script?.getAttribute('defer')).toBe('')
  })

  it('should handle script with API integration', async () => {
    const head = createHead()
    const context = new Map()
    context.set(UnheadContextKey, head)

    // Mock API
    ;(window as any).ExampleAPI = { init: vi.fn() }

    render(ScriptProxy, {
      context,
    })

    await new Promise(r => setTimeout(r, 10))

    const script = document.querySelector('script')
    script?.dispatchEvent(new Event('load'))

    await new Promise(r => setTimeout(r, 30))
    expect((window as any).ExampleAPI.init).toHaveBeenCalled()
  })

  it('should handle script load errors', async () => {
    const head = createHead()
    const context = new Map()
    context.set(UnheadContextKey, head)

    const vm = render(ScriptLoading, {
      context,
      props: {
        src: 'https://example.com/error.js',
      },
    })

    await new Promise(r => setTimeout(r, 10))

    const script = document.querySelector('script')
    script?.dispatchEvent(new Event('error'))

    await new Promise(r => setTimeout(r, 30))

    expect(vm.container.outerHTML).includes('Script Error')
  })

  it('should handle warmup strategy', async () => {
    const head = createHead()
    const context = new Map()
    context.set(UnheadContextKey, head)

    render(ScriptLoading, {
      context,
      props: {
        src: 'https://cdn.jsdelivr.net/npm/confetti-js@0.0.18/dist/index.min.js',
        warmupStrategy: 'preload',
      },
    })

    await new Promise(r => setTimeout(r, 10))
    expect(document.querySelector('link[rel="preload"][as="script"]')).toBeTruthy()
  })
})
