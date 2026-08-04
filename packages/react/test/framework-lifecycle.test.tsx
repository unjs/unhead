// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import React, { StrictMode } from 'react'
import { describe, expect, it } from 'vitest'
import { Head, useScript, useUnhead } from '../src'
import { createHead, UnheadProvider } from '../src/client'

function wait(ms = 10) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

describe('react framework lifecycle', () => {
  it('keeps an implicit provider head stable across rerenders', () => {
    const seen: unknown[] = []
    function Capture({ label }: { label: string }) {
      seen.push(useUnhead())
      return <div>{label}</div>
    }
    const renderApp = (label: string) => (
      <UnheadProvider>
        <Capture label={label} />
      </UnheadProvider>
    )
    const { rerender } = render(renderApp('first'))
    rerender(renderApp('second'))

    expect(seen.at(-1)).toBe(seen[0])
  })

  it('keeps one Head entry in StrictMode and disposes it', async () => {
    const head = createHead({ init: [{ title: 'Initial' }] })
    const { unmount } = render(
      <StrictMode>
        <UnheadProvider head={head}>
          <Head><title>Page</title></Head>
        </UnheadProvider>
      </StrictMode>,
    )

    await act(() => wait())
    expect(head.entries.size).toBe(2)

    await act(async () => {
      unmount()
      await wait()
    })
    expect(head.entries.size).toBe(1)
  })

  it('does not load promise-triggered scripts after unmount', async () => {
    const head = createHead()
    let resolveTrigger!: () => void
    const trigger = new Promise<void>(resolve => resolveTrigger = resolve)
    function Page() {
      useScript('//strict-unmount.js', { trigger, head })
      return null
    }
    const { unmount } = render(
      <StrictMode>
        <UnheadProvider head={head}><Page /></UnheadProvider>
      </StrictMode>,
    )
    await act(() => wait())
    const script = (head as any)._scripts['//strict-unmount.js']

    unmount()
    resolveTrigger()
    await act(() => wait())

    expect(script.status).toBe('awaitingLoad')
  })

  it('keeps render callbacks through StrictMode effect replay', async () => {
    const head = createHead()
    function Page() {
      const script = useScript('//strict-callback.js', { trigger: 'manual', head })
      script.onLoaded(() => {})
      return null
    }
    render(
      <StrictMode>
        <UnheadProvider head={head}><Page /></UnheadProvider>
      </StrictMode>,
    )
    await act(() => wait())

    const script = (head as any)._scripts['//strict-callback.js']
    expect(script._cbs.loaded).toHaveLength(1)
  })

  it('registers callbacks created after commit', async () => {
    const head = createHead()
    function Page() {
      const script = useScript('//effect-callback.js', { trigger: 'manual', head })
      React.useEffect(() => script.onLoaded(() => {}), [script])
      return null
    }
    render(<UnheadProvider head={head}><Page /></UnheadProvider>)
    await act(() => wait())

    const script = (head as any)._scripts['//effect-callback.js']
    expect(script._cbs.loaded).toHaveLength(1)
  })
})
