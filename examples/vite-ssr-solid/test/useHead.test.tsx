// @vitest-environment jsdom
import { fireEvent, render } from '@solidjs/testing-library'
import { createSignal, onMount } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { useHead } from '../src'
import { createHead, UnheadProvider } from '../src/client'
import { renderSSRHead } from '../src/server'

function TestComponent() {
  const [title, setTitle] = createSignal('Initial Title')
  let inputRef: HTMLInputElement

  useHead({
    title: title(),
  })

  onMount(() => {
    if (inputRef) {
      inputRef.value = title()
    }
  })

  return (
    <div>
      <input ref={inputRef} onInput={e => setTitle(e.currentTarget.value)} />
    </div>
  )
}

function TestComponentWithMemo() {
  const [title, setTitle] = createSignal('Initial Title')
  const [content, setContent] = createSignal('Initial Description')
  let inputRef: HTMLInputElement

  const headConfig = () => ({
    title: title(),
    meta: [
      { name: 'description', content: content() },
      { property: 'og:title', content: title() },
    ],
  })

  useHead(headConfig())

  onMount(() => {
    if (inputRef) {
      inputRef.value = title()
    }
  })

  return (
    <div>
      <input ref={inputRef} onInput={e => setTitle(e.currentTarget.value)} />
      <input value={content()} onInput={e => setContent(e.currentTarget.value)} />
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
    fireEvent.input(input, { target: { value: 'Updated Title' } })

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
    fireEvent.input(input, { target: { value: 'Updated Title' } })

    const descriptionInput = getAllByRole('textbox')[1] as HTMLInputElement
    fireEvent.input(descriptionInput, { target: { value: 'Updated Description' } })

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
