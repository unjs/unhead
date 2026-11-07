import { expect, it } from 'vitest'
import { compileTags } from '../../../src/compiled/compile'
import { createHead, renderSSRHead } from '../../../src/compiled/server'

it('renders correctly past the memo node cap', () => {
  const compiledTagSets = Array.from({ length: 2100 }, (_, i) => compileTags({ title: `t${i}` })).map(r => r._tag === 'Ok' ? r.tags : [])
  for (let round = 0; round < 2; round++) {
    compiledTagSets.forEach((compiledTags, i) => {
      const head = createHead({ disableDefaults: true })
      head.push(compiledTags)
      expect(renderSSRHead(head).headTags).toBe(`<title>t${i}</title>`)
    })
  }
})
