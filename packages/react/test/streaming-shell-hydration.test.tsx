// @vitest-environment jsdom
import { PassThrough } from 'node:stream'
import { act, fireEvent, render } from '@testing-library/react'
import React, { useState } from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { expect, it } from 'vitest'
import { useHead } from '../src'
import { createHead, renderDOMHead } from '../src/client'
import { HeadStream as ClientHeadStream } from '../src/stream/client'
import { createStreamableHead, HeadStream, UnheadProvider } from '../src/stream/server'

it('hydrates the empty shell HeadStream and keeps client head updates working', async () => {
  const context = createStreamableHead({
    init: [{ link: [{ id: 'plugin-preload', rel: 'preload', as: 'style', href: '/plugin.css' }] }],
  })
  function App({ Stream = HeadStream }: { Stream?: typeof HeadStream }) {
    const [title, setTitle] = useState('Initial page')
    useHead({ title })
    return (
      <>
        <Stream />
        <button onClick={() => setTitle('Next page')}>{title}</button>
      </>
    )
  }

  const output = new PassThrough()
  const done = (async () => {
    let html = ''
    for await (const chunk of output)
      html += chunk
    return html
  })()
  const { pipe } = renderToPipeableStream(<UnheadProvider value={context.head}><App /></UnheadProvider>, {
    onShellReady: context.onShellReady,
    onShellError: error => output.destroy(error as Error),
  })
  context.wrap(pipe, '<html><head></head><body><div id="app"><!--app-html--></div></body></html>')(output)
  const parsed = new DOMParser().parseFromString(await done, 'text/html')
  document.documentElement.innerHTML = parsed.documentElement.innerHTML
  const container = document.getElementById('app')!
  const serverScript = container.querySelector('script')
  const serverButton = container.querySelector('button')
  const errors: unknown[] = []
  const head = createHead({ document })

  const hydrated = render(<UnheadProvider value={head}><App Stream={ClientHeadStream} /></UnheadProvider>, {
    container,
    hydrate: true,
    onRecoverableError: error => errors.push(error),
  })
  await act(async () => {
    renderDOMHead(head)
  })
  expect(errors).toEqual([])
  expect(container.querySelector('script')).toBe(serverScript)
  expect(container.querySelector('button')).toBe(serverButton)
  expect(document.head.querySelectorAll('#plugin-preload')).toHaveLength(1)
  expect(document.title).toBe('Initial page')

  fireEvent.click(hydrated.getByRole('button'))
  await act(async () => {
    renderDOMHead(head)
  })
  expect(document.title).toBe('Next page')
  expect(document.querySelectorAll('title')).toHaveLength(1)
})
