// @vitest-environment jsdom
import { fireEvent, render } from '@solidjs/testing-library'
import { createSignal, onMount } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { useSeoMeta } from '../src'
import { createHead, UnheadProvider } from '../src/client'
import { renderSSRHead } from '../src/server'

function TestComponentWithRef() {
  const [title, setTitle] = createSignal('Initial Title')

  useSeoMeta({
    title: title(),
    description: 'Initial Description',
  })

  onMount(() => {
    setTitle('Updated Title')
  })

  return (
    <div>
      <p>{title()}</p>
    </div>
  )
}

function TestComponent() {
  const [title, setTitle] = createSignal('Initial Title')
  let inputRef: HTMLInputElement

  useSeoMeta({
    title: title(),
    description: 'Initial Description',
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

describe('useSeoMeta hook', () => {
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

  it('updates head title based on ref value after effect', async () => {
    const head = createHead()

    render(
      <UnheadProvider head={head}>
        <TestComponentWithRef />
      </UnheadProvider>,
    )

    const { headTags } = await renderSSRHead(head)
    expect(headTags).toContain('<title>Updated Title</title>')
  })
})
