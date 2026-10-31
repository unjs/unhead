// @vitest-environment jsdom
import type { UseHeadInput } from 'unhead/types'
import { cleanup, render } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createHead as createCsrHead,
  UnheadProvider as CsrProvider,
  useHead as useCsrHead,
} from '../src/precompiled/client-csr'
import {
  createHead as createDeferredHead,
  UnheadProvider as DeferredProvider,
  useHead as useDeferredHead,
} from '../src/precompiled/client-deferred'

const titlePlan = [
  [100, 'title', 'title', {}, 'Profiled React'],
] as unknown as UseHeadInput

afterEach(() => {
  cleanup()
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('precompiled React client profiles', () => {
  it('keeps one CSR entry through StrictMode replay and disposes it on unmount', () => {
    document.title = 'Initial title'
    const head = createCsrHead()

    function Page() {
      useCsrHead(titlePlan)
      return null
    }

    const app = render(
      <StrictMode>
        <CsrProvider head={head}>
          <Page />
        </CsrProvider>
      </StrictMode>,
    )

    expect(head._e.size).toBe(1)
    expect(document.title).toBe('Profiled React')

    app.unmount()
    expect(head._e.size).toBe(0)
    expect(document.title).toBe('Initial title')
  })

  it('queues one deferred entry through StrictMode replay and disposes it after loading', async () => {
    document.title = 'SSR title'
    const head = createDeferredHead()

    function Page() {
      useDeferredHead(titlePlan)
      return null
    }

    const app = render(
      <StrictMode>
        <DeferredProvider head={head}>
          <Page />
        </DeferredProvider>
      </StrictMode>,
    )

    expect(document.title).toBe('SSR title')
    await head.ready
    expect(document.title).toBe('Profiled React')

    app.unmount()
    expect(document.title).toBe('SSR title')
  })
})
