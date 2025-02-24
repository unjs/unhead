// @vitest-environment jsdom
import { render, fireEvent } from '@solidjs/testing-library'
import { describe, expect, it } from 'vitest'
import { createHead } from '../src/client'
import { UnheadProvider } from '../src/client'
import { renderSSRHead } from '../src/server'
import { ReactiveTitle } from './fixtures/ReactiveTitle'
import userEvent from "@testing-library/user-event"

const user = userEvent.setup()

describe('unheadProvider', () => {
  it('updates head when title changes', async () => {
    const head = createHead()
    const { getByText } = render(() => (
      <UnheadProvider head={head}>
        <ReactiveTitle />
      </UnheadProvider>
    ))

    expect(getByText('Test')).toBeDefined()

    await user.click(getByText('Update'))

    expect(getByText('Updated')).toBeDefined()
    const res = await renderSSRHead(head)
    expect(res.headTags).toEqual(`<title>Updated</title>`)
  })
})
