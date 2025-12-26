import { describe, it } from 'vitest'
import { useHead } from '../../../src'
import { renderDOMHead } from '../../../src/client'
import { createClientHeadWithContext, useDom } from '../../util'

describe('dom order', () => {
  it('renders in registered order', () => {
    const dom = useDom()
    const head = createClientHeadWithContext({
      document: dom.window.document,
    })

    useHead(head, {
      htmlAttrs: {
        class: 'no-js',
      },
      script: [{ innerHTML: 'document.documentElement.classList.remove("no-js")' }],
    })

    renderDOMHead(head, { document: dom.window.document })

    // Check that the script was rendered
    const scripts = dom.window.document.head.querySelectorAll('script')
    expect(scripts.length).toBe(1)
    expect(scripts[0].innerHTML).toBe('document.documentElement.classList.remove("no-js")')

    // Check that the class was applied
    expect(dom.window.document.documentElement.classList.contains('no-js')).toBe(true)
  })
})
