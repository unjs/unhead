// @vitest-environment node
import type { UseHeadInput } from 'unhead/types'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createHead, renderSSRHead, UnheadProvider, useHead } from '../src/precompiled/server'

const titlePlan = [
  [100, 'title', '<title>Sealed React SSR</title>'],
] as unknown as UseHeadInput

describe('precompiled React server lifecycle', () => {
  it('appends one compiled plan for one component render lifecycle', () => {
    const head = createHead()
    const initialPlanCount = head._p.length

    function Page() {
      useHead(titlePlan)
      return <main>Page</main>
    }

    expect(renderToString(
      <UnheadProvider value={head}>
        <Page />
      </UnheadProvider>,
    )).toContain('<main>Page</main>')

    expect(head._p).toHaveLength(initialPlanCount + 1)
    expect(renderSSRHead(head).headTags).toContain('<title>Sealed React SSR</title>')
  })

  it('forwards static server options to the core head', () => {
    expect(createHead({ disableDefaults: true })._p).toHaveLength(0)
  })
})
