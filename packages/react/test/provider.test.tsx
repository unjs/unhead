// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { renderSSRHead } from '@unhead/ssr'
import { describe, expect, it } from 'vitest'
import { createHead, unheadCtx, UnheadProvider } from '../src'
import { ReactiveTitle } from './fixtures/ReactiveTitle'

describe('unheadProvider', () => {
  it('updates head when title changes', async () => {
    const head = createHead()
    unheadCtx.set(head)
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
    const res = await renderSSRHead(head)
    expect(res.headTags).toEqual(`<title>Updated</title>`)
  })
})
