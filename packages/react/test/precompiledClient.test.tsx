// @vitest-environment jsdom
import type { UseHeadInput } from 'unhead/types'
import { cleanup, render } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
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
  it('does not orphan entries during the StrictMode effect replay and disposes on unmount', () => {
    document.title = 'Initial title'
    const head = createHead()

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
    expect(document.title).toBe('Sealed React')

    app.unmount()
    expect(head._e.size).toBe(0)
    expect(document.title).toBe('Initial title')
  })

  it('accepts the context-compatible value provider prop', () => {
    const head = createHead()
    function Page() {
      useHead(titlePlan)
      return null
    }

    const app = render(<UnheadProvider value={head}><Page /></UnheadProvider>)
    expect(document.title).toBe('Sealed React')
    app.unmount()
    expect(head._e.size).toBe(0)
  })
})
