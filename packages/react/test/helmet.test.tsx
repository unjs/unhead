// @vitest-environment jsdom
import { render } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createHead, renderDOMHead, UnheadProvider } from '../src/client'
import { Helmet } from '../src/helmet'
import { renderSSRHead } from '../src/server'

describe('helmet compat', () => {
  it('renders basic head tags from JSX children', async () => {
    const head = createHead()

    render(
      <UnheadProvider head={head}>
        <Helmet>
          <title>My Page</title>
          <meta name="description" content="A test page" />
          <link rel="canonical" href="https://example.com" />
        </Helmet>
      </UnheadProvider>,
    )

    const { headTags } = renderSSRHead(head)
    expect(headTags).toContain('<title>My Page</title>')
    expect(headTags).toContain('<meta name="description" content="A test page">')
    expect(headTags).toContain('<link rel="canonical" href="https://example.com">')
  })

  it('supports titleTemplate prop', async () => {
    const head = createHead()

    render(
      <UnheadProvider head={head}>
        <Helmet titleTemplate="%s | My Site">
          <title>Page</title>
        </Helmet>
      </UnheadProvider>,
    )

    const { headTags } = renderSSRHead(head)
    expect(headTags).toContain('<title>Page | My Site</title>')
  })

  it('applies defaultTitle when no title child is provided', async () => {
    const head = createHead()

    render(
      <UnheadProvider head={head}>
        <Helmet defaultTitle="My Site">
          <meta name="description" content="Homepage" />
        </Helmet>
      </UnheadProvider>,
    )

    const { headTags } = renderSSRHead(head)
    expect(headTags).toContain('<title>My Site</title>')
  })

  it('ignores defaultTitle when a title child is provided', async () => {
    const head = createHead()

    render(
      <UnheadProvider head={head}>
        <Helmet defaultTitle="My Site">
          <title>Custom Page</title>
          <meta name="description" content="A page" />
        </Helmet>
      </UnheadProvider>,
    )

    const { headTags } = renderSSRHead(head)
    expect(headTags).toContain('<title>Custom Page</title>')
    expect(headTags).not.toContain('My Site')
  })

  it('uses defaultTitle with titleTemplate', async () => {
    const head = createHead()

    render(
      <UnheadProvider head={head}>
        <Helmet defaultTitle="Home" titleTemplate="%s | My Site">
          <meta name="description" content="Homepage" />
        </Helmet>
      </UnheadProvider>,
    )

    const { headTags } = renderSSRHead(head)
    expect(headTags).toContain('<title>Home | My Site</title>')
  })

  it('calls onChangeClientState after DOM render', async () => {
    const head = createHead()
    const onChangeClientState = vi.fn()

    render(
      <UnheadProvider head={head}>
        <Helmet onChangeClientState={onChangeClientState}>
          <title>Test Page</title>
        </Helmet>
      </UnheadProvider>,
    )

    await renderDOMHead(head, { document })

    expect(onChangeClientState).toHaveBeenCalled()
    const [state] = onChangeClientState.mock.calls[0]
    expect(state.title).toBe('Test Page')
  })

  it('renders script tags with innerHTML', async () => {
    const head = createHead()

    render(
      <UnheadProvider head={head}>
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify({ '@context': 'https://schema.org' })}
          </script>
        </Helmet>
      </UnheadProvider>,
    )

    const { headTags } = renderSSRHead(head)
    expect(headTags).toContain('application/ld+json')
    expect(headTags).toContain('https://schema.org')
  })

  it('accepts deprecated props without error', async () => {
    const head = createHead()

    // Should not throw
    render(
      <UnheadProvider head={head}>
        <Helmet encodeSpecialCharacters={false} defer={false}>
          <title>Test</title>
        </Helmet>
      </UnheadProvider>,
    )

    const { headTags } = renderSSRHead(head)
    expect(headTags).toContain('<title>Test</title>')
  })

  it('cleans up on unmount', async () => {
    const head = createHead()

    const { unmount } = render(
      <UnheadProvider head={head}>
        <Helmet>
          <title>Will Unmount</title>
          <meta name="description" content="Gone soon" />
        </Helmet>
      </UnheadProvider>,
    )

    unmount()

    const { headTags } = renderSSRHead(head)
    expect(headTags).toBe('')
  })
})
