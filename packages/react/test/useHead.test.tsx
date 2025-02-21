// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { useHead } from '../src'
import { createHead, UnheadProvider } from '../src/client'
import { renderSSRHead } from '../src/server'

function TestComponent() {
  const [title, setTitle] = useState('Initial Title')
  const inputRef = useRef<HTMLInputElement>(null)

  useHead({
    title,
  })

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = title
    }
  }, [title])

  return (
    <div>
      <input ref={inputRef} onChange={e => setTitle(e.target.value)} />
    </div>
  )
}

function TestComponentWithMemo() {
  const [title, setTitle] = useState('Initial Title')
  const [content, setContent] = useState('Initial Description')
  const inputRef = useRef<HTMLInputElement>(null)

  const headConfig = useMemo(() => ({
    title,
    meta: [
      { name: 'description', content },
      { property: 'og:title', content: title },
    ],
  }), [title, content])

  useHead(headConfig)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = title
    }
  }, [title])

  return (
    <div>
      <input ref={inputRef} onChange={e => setTitle(e.target.value)} />
      <input value={content} onChange={e => setContent(e.target.value)} />
    </div>
  )
}

describe('useHead hook', () => {
  it('updates head title based on state', async () => {
    const head = createHead()

    const { getByRole } = render(
      <UnheadProvider head={head}>
        <TestComponent />
      </UnheadProvider>,
    )

    const input = getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Updated Title' } })

    const { headTags } = await renderSSRHead(head)
    expect(headTags).toContain('<title>Updated Title</title>')
  })

  it('initializes input value with state', () => {
    const head = createHead()

    const { getByRole } = render(
      <UnheadProvider head={head}>
        <TestComponent />
      </UnheadProvider>,
    )

    const input = getByRole('textbox') as HTMLInputElement
    expect(input.value).toBe('Initial Title')
  })
  it('updates head title and meta tags based on state', async () => {
    const head = createHead()

    const { getAllByRole } = render(
      <UnheadProvider head={head}>
        <TestComponentWithMemo />
      </UnheadProvider>,
    )

    const input = getAllByRole('textbox')[0] as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Updated Title' } })

    const descriptionInput = getAllByRole('textbox')[1] as HTMLInputElement
    fireEvent.change(descriptionInput, { target: { value: 'Updated Description' } })

    const { headTags } = await renderSSRHead(head)
    expect(headTags).toContain('<title>Updated Title</title>')
    expect(headTags).toContain('<meta name="description" content="Updated Description">')
    expect(headTags).toContain('<meta property="og:title" content="Updated Title">')
  })

  it('initializes input values with state', () => {
    const head = createHead()

    const { getAllByRole } = render(
      <UnheadProvider head={head}>
        <TestComponentWithMemo />
      </UnheadProvider>,
    )

    const input = getAllByRole('textbox')[0] as HTMLInputElement
    expect(input.value).toBe('Initial Title')

    const descriptionInput = getAllByRole('textbox')[1] as HTMLInputElement
    expect(descriptionInput.value).toBe('Initial Description')
  })
})
