import { expect, it, vi } from 'vitest'
import { createHead, getRenderTier, renderSSRHead } from '../../../src/compiled/server'

// The count of compiled tag sets is process-wide, so this file holds one test.

// one set of compiled tags per head, as code that builds compiled tags per request makes
function headOf(i: number) {
  const head = createHead({ disableDefaults: true })
  head.push([['title', 0, 10, 'title', { textContent: `t${i}` }, 1]])
  return head
}

it('reports a memo that turned off, and warns once', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  for (let i = 0; i < 8000; i++)
    renderSSRHead(headOf(i))
  expect(getRenderTier(headOf(0))).toEqual({ _tag: 'Memo' })
  expect(warn).not.toHaveBeenCalled()

  for (let i = 8000; i < 12_000; i++)
    renderSSRHead(headOf(i))
  expect(getRenderTier(headOf(0))).toEqual({ _tag: 'Fast', reason: expect.stringContaining('the memo is off') })
  expect(renderSSRHead(headOf(0)).headTags).toBe('<title>t0</title>')
  expect(warn.mock.calls.map(call => call[0])).toEqual([expect.stringContaining('turned its memo off')])
  warn.mockRestore()
})
