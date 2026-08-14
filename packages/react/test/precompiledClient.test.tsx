// @vitest-environment jsdom
import type { UseHeadInput } from 'unhead/types'
import { cleanup, render } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHead, UnheadProvider, useHead } from '../src/precompiled/client'

const titlePlan = [
  [100, 'title', 'title', {}, 'Sealed React'],
] as unknown as UseHeadInput

afterEach(() => {
  cleanup()
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('precompiled React client lifecycle', () => {
  it('batches StrictMode effect replay and disposes on unmount', async () => {
    document.title = 'Initial title'
    const head = createHead()
    const renderHead = vi.spyOn(head, 'render')

    function Page() {
      useHead(titlePlan)
      return null
    }

    const app = render(
      <StrictMode>
        <UnheadProvider head={head}>
          <Page />
        </UnheadProvider>
      </StrictMode>,
    )

    expect(head._e.size).toBe(1)
    await Promise.resolve()
    expect(renderHead).toHaveBeenCalledTimes(1)
    expect(document.title).toBe('Sealed React')

    app.unmount()
    expect(head._e.size).toBe(0)
    await Promise.resolve()
    expect(renderHead).toHaveBeenCalledTimes(2)
    expect(document.title).toBe('Initial title')
  })

  it('accepts the context-compatible value provider prop', async () => {
    const head = createHead()
    function Page() {
      useHead(titlePlan)
      return null
    }

    const app = render(<UnheadProvider value={head}><Page /></UnheadProvider>)
    await Promise.resolve()
    expect(document.title).toBe('Sealed React')
    app.unmount()
    await Promise.resolve()
    expect(head._e.size).toBe(0)
  })
})
