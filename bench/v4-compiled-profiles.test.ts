// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createHead as createClientHead } from '../packages/unhead/src/v4/client-compiled'
import { emitEntryPlan } from '../packages/unhead/src/v4/emit'
import { createHead as createServerHead, renderSSRHead } from '../packages/unhead/src/v4/server-compiled'
import { useDom } from '../packages/unhead/test/fixtures'

describe('v4 compiled profiles', () => {
  it('renders sealed plans on the server with defaults', () => {
    const head = createServerHead()
    head.push(emitEntryPlan({ title: 'Compiled', meta: [{ name: 'description', content: 'small' }] }).plan)

    expect(renderSSRHead(head)).toEqual({
      bodyAttrs: '',
      bodyTags: '',
      bodyTagsOpen: '',
      headTags: '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Compiled</title><meta name="description" content="small">',
      htmlAttrs: ' lang="en"',
    })
  })

  it('renders and patches sealed plans on the client', () => {
    const dom = useDom()
    const head = createClientHead({ document: dom.window.document, scheduler: () => {} })
    const entry = head.push(emitEntryPlan({ title: 'First', meta: [{ name: 'description', content: 'one' }] }).plan)

    expect(head.render()).toBe(true)
    expect(dom.window.document.title).toBe('First')
    expect(dom.window.document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('one')

    entry.patch(emitEntryPlan({ title: 'Second', meta: [{ name: 'description', content: 'two' }] }).plan)
    expect(head.render()).toBe(true)
    expect(dom.window.document.title).toBe('Second')
    expect(dom.window.document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('two')
  })

  it('has no loose object fallback', () => {
    const head = createServerHead({ disableDefaults: true })
    expect(() => (head as any).use({ key: 'unsafe' })).toThrowError('compiled heads cannot install runtime plugins')
    ;(head.push as (input: unknown) => unknown)({ title: 'loose' })

    expect(() => renderSSRHead(head)).toThrowError('[unhead] strict core cannot compile loose input')
  })

  it('rejects plugin options passed by untyped framework templates', () => {
    expect(() => createServerHead({ plugins: [] } as any)).toThrowError('compiled heads cannot install runtime plugins')
    expect(() => createClientHead({ plugins: [] } as any)).toThrowError('compiled heads cannot install runtime plugins')
  })

  it('exposes only branded plans and no plugin surface', () => {
    if (false) {
      const head = createServerHead()
      // @ts-expect-error loose inputs require the regular runtime profile
      head.push({ title: 'loose' })
      // @ts-expect-error compiled plans have no prop-bearing plugin contract
      head.use({ key: 'plugin' })
    }
    expect(true).toBe(true)
  })
})
