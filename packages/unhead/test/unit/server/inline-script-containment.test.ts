import { describe, expect, it } from 'vitest'
import { createHead, renderSSRHead } from '../../../src/server'

describe('inline script containment', () => {
  it('keeps following head markup outside an inline data script', async () => {
    const head = createHead({ disableDefaults: true })
    head.push({ script: [{ type: 'text/plain', innerHTML: '<!-- <script>Sample data' }] })

    const { headTags } = await renderSSRHead(head)

    expect(headTags).toBe('<script type="text/plain"></script>')
  })

  it('retains data when the inline script can close', async () => {
    const head = createHead({ disableDefaults: true })
    head.push({ script: [{ type: 'text/plain', innerHTML: '<!-- <script>Sample data -->' }] })

    const { headTags } = await renderSSRHead(head)

    expect(headTags).toBe('<script type="text/plain"><!-- <script>Sample data --></script>')
  })
})
