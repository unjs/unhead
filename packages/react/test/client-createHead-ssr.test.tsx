// @vitest-environment node
import React from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createHead, UnheadProvider } from '../src/client'
import { useHead } from '../src/composables'

describe('client createHead during SSR', () => {
  it('does not retain entries across server renders', () => {
    const head = createHead()

    function Page() {
      useHead({ title: 'Client head' })
      return <div>Page</div>
    }

    const render = () => renderToString(
      <UnheadProvider head={head}>
        <Page />
      </UnheadProvider>,
    )

    const entryCounts = [head.entries.size]
    render()
    entryCounts.push(head.entries.size)
    render()
    entryCounts.push(head.entries.size)

    expect(entryCounts).toEqual([0, 0, 0])
    expect(head.ssr).toBe(false)
  })
})
