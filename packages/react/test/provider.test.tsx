// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createHead, UnheadProvider } from '../src'
import { ReactiveTitle } from './fixtures/ReactiveTitle'

describe('unheadProvider', () => {
  it('updates head when title changes', async () => {
    const head = createHead()
    const { getByText } = render(
      <UnheadProvider options={{}}>
        <ReactiveTitle />
      </UnheadProvider>,
    )

    expect(getByText('Test')).toBeDefined()

    await act(async () => {
      getByText('Update').click()
    })

    expect(getByText('Updated')).toBeDefined()
  })
})
