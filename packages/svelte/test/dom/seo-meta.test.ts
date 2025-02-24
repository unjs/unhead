// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/svelte'
import { beforeEach, describe, expect, it } from 'vitest'
import { createHead, UnheadContextKey } from '../../src/client'
import SeoTest from '../fixtures/SeoTest.svelte'

describe('svelte useSeoMeta', () => {
  beforeEach(() => {
    cleanup()
    document.head.innerHTML = ''
  })

  it('should render basic meta tags', async () => {
    const head = createHead()
    const context = new Map()
    context.set(UnheadContextKey, head)
    render(SeoTest, { context })

    await new Promise(r => setTimeout(r, 30))

    expect(document.querySelector('meta[name="description"]')?.getAttribute('content'))
      .toBe('My page description')
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content'))
      .toBe('My Page')
  })

  it('should update meta tags reactively', async () => {
    const head = createHead()
    const context = new Map()
    context.set(UnheadContextKey, head)
    const { container } = render(SeoTest, { context })

    await new Promise(r => setTimeout(r, 10))
    container.querySelector('button')?.click()
    await new Promise(r => setTimeout(r, 10))

    expect(document.querySelector('meta[name="description"]')?.getAttribute('content'))
      .toBe('Updated description')
  })

  it('should handle null values', async () => {
    const head = createHead()
    const context = new Map()
    context.set(UnheadContextKey, head)
    render(SeoTest, { context, props: { initialDescription: null } })

    await new Promise(r => setTimeout(r, 10))
    expect(document.querySelector('meta[name="description"]')).toBeNull()
  })

  it('should cleanup meta tags on unmount', async () => {
    const head = createHead()
    const context = new Map()
    context.set(UnheadContextKey, head)
    const { unmount } = render(SeoTest, { context })

    await new Promise(r => setTimeout(r, 10))
    unmount()
    await new Promise(r => setTimeout(r, 10))

    expect(document.querySelector('meta[name="description"]')).toBeNull()
  })
})
