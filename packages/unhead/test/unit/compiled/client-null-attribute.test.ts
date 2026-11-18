import { JSDOM } from 'jsdom'
import { expect, it, vi } from 'vitest'
import { compileTags, dynamicValue } from '../../../src/compiled'
import { createLazyHead } from '../../../src/lazy'

it('renders dynamic meta content with a static null attribute through a lazy head', async () => {
  const result = compileTags({
    meta: [{ 'name': 'description', 'content': dynamicValue(0), 'data-extra': null }],
  }, { dynamicValues: 1 })
  if (result._tag !== 'Ok')
    throw new Error(result.reason)

  const { document } = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>').window
  const onLoadError = vi.fn()
  vi.useFakeTimers()
  try {
    const head = createLazyHead({ document, onLoadError })
    head.push(result.tags, { values: ['Dynamic description'] })
    head.render()
    expect(await head.load()).toBe(true)
    await vi.runAllTimersAsync()
    expect(document.head.innerHTML).toBe('<meta name="description" content="Dynamic description">')
    expect(onLoadError).not.toHaveBeenCalled()
  }
  finally {
    vi.useRealTimers()
  }
})
