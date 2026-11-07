import { expect, it } from 'vitest'
import { createHead, prepareHeadInput, renderSSRHead } from '../../../src/compiled/server'

// its own file, so the module-level cache starts empty
it('stops compiling new keys once the keyed cache is full', () => {
  const input = (i: number) => ({ link: [{ rel: 'stylesheet', href: `/${i}.css` }] })
  let full = -1
  for (let i = 0; i < 5000 && full < 0; i++) {
    if (!Array.isArray(prepareHeadInput(input(i), `route:${i}`)))
      full = i
  }
  expect(full).toBeGreaterThan(100)
  const late = input(full + 1)
  expect(prepareHeadInput(late, `route:${full + 1}`)).toBe(late)
  // keys from before the cap still hit
  const compiledTags = prepareHeadInput(input(0), 'route:0')
  expect(Array.isArray(compiledTags)).toBe(true)
  const head = createHead({ disableDefaults: true })
  head.push(compiledTags)
  head.push(late)
  expect(renderSSRHead(head).headTags).toBe(`<link rel="stylesheet" href="/0.css">\n<link rel="stylesheet" href="/${full + 1}.css">`)
})
