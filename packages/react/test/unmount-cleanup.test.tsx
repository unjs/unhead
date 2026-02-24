// @vitest-environment jsdom
import { act, fireEvent, render } from '@testing-library/react'
import React, { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { useHead } from '../src'
import { createHead, renderDOMHead, UnheadProvider } from '../src/client'

/**
 * Reproduction of https://github.com/unjs/unhead/issues/558
 * React 18 reporter says metadata persists after component unmount
 */

function Page1() {
  useHead({
    title: 'Page 1 title',
    meta: [{ name: 'description', content: 'page 1 description' }],
  })
  return <div>Page 1</div>
}

function Page2() {
  return <div>Page 2</div>
}

function App({ head }: { head: ReturnType<typeof createHead> }) {
  const [currPage, setCurrPage] = useState<'Page 1' | 'Page 2'>('Page 2')
  return (
    <UnheadProvider head={head}>
      <button onClick={() => setCurrPage('Page 1')}>Page 1</button>
      <button onClick={() => setCurrPage('Page 2')}>Page 2</button>
      {currPage === 'Page 1' ? <Page1 /> : <Page2 />}
    </UnheadProvider>
  )
}

function wait(ms = 10) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

describe('issue #558 - unmount cleanup', () => {
  it('restores init values after component unmount (DOM rendering)', async () => {
    const head = createHead({
      init: [{
        title: 'Example fallback',
        meta: [{ name: 'description', content: 'some description' }],
      }],
    })

    const { getByText } = render(<App head={head} />)

    // Initial DOM render
    await act(async () => {
      await renderDOMHead(head)
      await wait()
    })

    expect(document.title).toBe('Example fallback')

    // Switch to Page 1
    await act(async () => {
      fireEvent.click(getByText('Page 1'))
      await wait()
    })
    await act(async () => {
      await renderDOMHead(head)
      await wait()
    })

    expect(document.title).toBe('Page 1 title')

    // Switch back to Page 2
    await act(async () => {
      fireEvent.click(getByText('Page 2'))
      await wait()
    })
    await act(async () => {
      await renderDOMHead(head)
      await wait()
    })

    expect(document.title).toBe('Example fallback')
  })

  it('handles multiple page switches correctly (DOM)', async () => {
    const head = createHead({
      init: [{
        title: 'Fallback',
        meta: [{ name: 'description', content: 'fallback desc' }],
      }],
    })

    const { getByText } = render(<App head={head} />)

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        fireEvent.click(getByText('Page 1'))
        await wait()
      })
      await act(async () => {
        await renderDOMHead(head)
        await wait()
      })
      expect(document.title).toBe('Page 1 title')

      await act(async () => {
        fireEvent.click(getByText('Page 2'))
        await wait()
      })
      await act(async () => {
        await renderDOMHead(head)
        await wait()
      })
      expect(document.title).toBe('Fallback')
    }
  })

  it('direct unmount restores init values (DOM)', async () => {
    const head = createHead({
      init: [{
        title: 'Init Title',
        meta: [{ name: 'description', content: 'init description' }],
      }],
    })

    function PageWithHead() {
      useHead({
        title: 'Component Title',
        meta: [{ name: 'description', content: 'component description' }],
      })
      return <div>Has Head</div>
    }

    const { unmount } = render(
      <UnheadProvider head={head}>
        <PageWithHead />
      </UnheadProvider>,
    )

    await act(async () => {
      await renderDOMHead(head)
      await wait()
    })

    expect(document.title).toBe('Component Title')

    await act(async () => {
      unmount()
      await wait()
    })
    await act(async () => {
      await renderDOMHead(head)
      await wait()
    })

    expect(document.title).toBe('Init Title')
  })

  it('entries state is correct through mount/unmount cycle', async () => {
    const head = createHead({
      init: [{
        title: 'Init',
      }],
    })

    function PageWithHead() {
      useHead({ title: 'Component' })
      return <div>Has Head</div>
    }

    // Initially, only init entry
    expect(head.entries.size).toBe(1)

    const { unmount } = render(
      <UnheadProvider head={head}>
        <PageWithHead />
      </UnheadProvider>,
    )

    await act(async () => {
      await wait()
    })

    // After mount, should have 2 entries
    expect(head.entries.size).toBe(2)

    await act(async () => {
      unmount()
      await wait()
    })

    // After unmount, back to 1 entry (init only)
    expect(head.entries.size).toBe(1)
  })
})
