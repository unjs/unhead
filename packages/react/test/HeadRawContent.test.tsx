// @vitest-environment jsdom
import { render } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Head } from '../src'
import { createHead, renderDOMHead, UnheadProvider } from '../src/client'

describe('head raw content in the DOM', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps dangerouslySetInnerHTML to supported head tag content', async () => {
    const head = createHead()
    const script = '<span data-value="script">& raw</span>'
    const style = 'body::before { content: "<unsafe>"; }'
    const noscript = '<img src="pixel.gif" alt="pixel">'

    render(
      <UnheadProvider head={head}>
        <Head>
          <script data-test="script" type="text/plain" dangerouslySetInnerHTML={{ __html: script }} />
          <style data-test="style" dangerouslySetInnerHTML={{ __html: style }} />
          <noscript data-test="noscript" dangerouslySetInnerHTML={{ __html: noscript }} />
        </Head>
      </UnheadProvider>,
    )

    await renderDOMHead(head, { document })

    expect(document.head.querySelector('[data-test="script"]')?.textContent).toBe(script)
    expect(document.head.querySelector('[data-test="style"]')?.textContent).toBe(style)
    expect(document.head.querySelector('[data-test="noscript"]')?.textContent).toBe(noscript)
    expect(document.head.querySelector('[dangerouslysetinnerhtml]')).toBeNull()
  })

  it('preserves TrustedHTML for the DOM sink', async () => {
    const html = '<span data-trusted>trusted</span>'
    const trustedHTML = { toString: () => html } as unknown as TrustedHTML
    vi.stubGlobal('trustedTypes', {
      isHTML: (value: unknown) => value === trustedHTML,
    })
    const head = createHead()
    let resolvedContent: unknown
    head.hooks.hook('tags:resolve', ({ tags }) => {
      resolvedContent = tags.find(tag => tag.tag === 'script')?.innerHTML
    })

    render(
      <UnheadProvider head={head}>
        <Head>
          <script data-test="trusted" type="text/plain" dangerouslySetInnerHTML={{ __html: trustedHTML }} />
        </Head>
      </UnheadProvider>,
    )

    await renderDOMHead(head, { document })

    expect(resolvedContent).toBe(trustedHTML)
    expect(document.head.querySelector('[data-test="trusted"]')?.innerHTML).toBe(html)
  })
})
