// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { useUnhead } from '@unhead/react'
import { createHead, UnheadProvider } from '@unhead/react/client'
import React, { useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { useScript } from '../../src/react/useScript'

function SimpleScriptComponent() {
  const head = useUnhead()
  const script1 = useScript({
    src: '//test.script',
  }, {
    head,
  })

  return (
    <div>
      <div data-testid="status1">{script1.status}</div>
    </div>
  )
}

function ActionToLoadScriptComponent() {
  const head = useUnhead()
  const shouldLoad = useRef(false)
  const [loaded, setLoaded] = useState(false)
  console.log('loaded', loaded)
  const script1 = useScript({
    src: '//test.script',
  }, {
    head,
    trigger: shouldLoad,
  })
  script1.onLoaded(() => {
    setLoaded(true)
  })

  return (
    <div>
      <div data-testid="status1">{script1.status}</div>
      <div data-testid="status2">{loaded ? 'true' : 'false'}</div>
      <button onClick={() => script1.load()}>Load Script</button>
    </div>
  )
}

function TestComponent({
  trigger1Active,
  trigger2Active,
  usePromise = false,
}: {
  trigger1Active?: boolean
  trigger2Active?: boolean
  usePromise?: boolean
}) {
  const [trigger1State, setTrigger1] = useState(trigger1Active || false)
  const [trigger2State, setTrigger2] = useState(trigger2Active || false)
  const script1 = useScript({
    src: '//duplicate.script',
  }, {
    trigger: usePromise
      ? new Promise<void>((resolve) => {
        if (trigger1State)
          resolve()
      })
      : trigger1State,
  })

  const script2 = useScript({
    src: '//duplicate.script',
  }, {
    trigger: usePromise
      ? new Promise<void>((resolve) => {
        if (trigger2State)
          resolve()
      })
      : trigger2State,
  })

  return (
    <div>
      <div data-testid="status1">{script1.status}</div>
      <div data-testid="status2">{script2.status}</div>
      <button onClick={() => setTrigger1(true)}>Activate Trigger 1</button>
      <button onClick={() => setTrigger2(true)}>Activate Trigger 2</button>
    </div>
  )
}

afterEach(() => {
  document.head.innerHTML = ''
})

describe('react e2e scripts', () => {
  it('multiple active promise handles', async () => {
    const head = createHead()

    const { getByTestId, getByText } = render(
      <UnheadProvider head={head}>
        <TestComponent />
      </UnheadProvider>,
    )

    // Initially both scripts should be in loading state
    expect(getByTestId('status1').textContent).toBe('loading')
    expect(getByTestId('status2').textContent).toBe('loading')

    // Trigger the first promise
    await act(async () => {
      getByText('Activate Trigger 1').click()
      // Wait for promises to resolve
      await new Promise(resolve => setTimeout(resolve, 25))
    })

    // Both scripts should still be loading (as they're pending script load)
    expect(getByTestId('status1').textContent).toBe('loading')
    expect(getByTestId('status2').textContent).toBe('loading')
  })

  it('ref trigger', async () => {
    const head = createHead()

    const { getByTestId, getByText } = render(
      <UnheadProvider head={head}>
        <TestComponent />
      </UnheadProvider>,
    )

    // Initially both scripts should be in loading state
    expect(getByTestId('status1').textContent).toBe('loading')
    expect(getByTestId('status2').textContent).toBe('loading')

    // Trigger the first state change
    await act(async () => {
      getByText('Activate Trigger 1').click()
      // Wait for state updates
      await new Promise(resolve => setTimeout(resolve, 25))
    })

    // Both scripts should still be loading (as they're pending script load)
    expect(getByTestId('status1').textContent).toBe('loading')
    expect(getByTestId('status2').textContent).toBe('loading')
  })

  it('handles script load success', async () => {
    const head = createHead()

    let component
    await act(async () => {
      component = render(
        <UnheadProvider head={head}>
          <SimpleScriptComponent />
        </UnheadProvider>,
      )
    })

    // Wait for initial mount
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    // Trigger script load event
    await act(async () => {
      const script = document.querySelector('script')
      script?.dispatchEvent(new Event('load'))
    })

    // Wait for state updates to propagate
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(await head.resolveTags()).toMatchInlineSnapshot(`
      [
        {
          "_e": 1,
          "_p": 1024,
          "props": {
            "as": "script",
            "crossorigin": "anonymous",
            "fetchpriority": "low",
            "href": "//test.script",
            "referrerpolicy": "no-referrer",
            "rel": "preload",
          },
          "tag": "link",
          "tagPriority": "high",
        },
        {
          "_d": "script:script.055eb22",
          "_e": 0,
          "_eventHandlers": {
            "onerror": [Function],
            "onload": [Function],
          },
          "_h": "7622761",
          "_p": 0,
          "key": "script.055eb22",
          "props": {
            "crossorigin": "anonymous",
            "data-hid": "7622761",
            "defer": true,
            "fetchpriority": "low",
            "referrerpolicy": "no-referrer",
            "src": "//test.script",
          },
          "tag": "script",
        },
      ]
    `)

    const { getByTestId } = component
    expect(getByTestId('status1').textContent).toBe('loaded')
  })

  it('handles delayed script load', async () => {
    const head = createHead()
    const { getByTestId, getByText } = render(
      <UnheadProvider head={head}>
        <ActionToLoadScriptComponent />
      </UnheadProvider>,
    )

    // Initially script should be in loading state
    expect(getByTestId('status1').textContent).toBe('loading')

    // Trigger script load event
    await act(async () => {
      getByText('Load Script').click()
      // Wait for state updates
      await new Promise(resolve => setTimeout(resolve, 25))
      const script = document.querySelector('script')
      script?.dispatchEvent(new Event('load'))
      await new Promise(resolve => setTimeout(resolve, 25))
    })
    await new Promise(resolve => setTimeout(resolve, 25))

    // Script should now be in loaded state
    expect(getByTestId('status1').textContent).toBe('loaded')
    expect(getByTestId('status2').textContent).toBe('true')
  })
})
