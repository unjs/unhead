import { expect, it } from 'vitest'
import { compileTags, createHead, dynamicValue, renderSSRHead } from '../../../src/compiled/server'

// These tests share the process-wide memo trie in order: each one counts the sets of compiled tags
// the ones before it added. The trie holds 2048 sets of compiled tags.

// one set of compiled tags per call, as a set built per request or a dev reload makes
function throwaway(count: number) {
  for (let i = 0; i < count; i++) {
    const head = createHead({ disableDefaults: true })
    head.push([['title', 0, 10, 'title', { textContent: `t${i}` }, 1]])
    expect(renderSSRHead(head).headTags).toBe(`<title>t${i}</title>`)
  }
}

// Whether a new route uses the memo: only the value memo can still return the old
// static parts after the compiled tags changed, because the slow path rebuilds the input.
function routeUsesMemo(): boolean {
  const result = compileTags({ title: dynamicValue(0), meta: [{ name: 'x', content: 'static' }] }, { dynamicValues: 1 })
  const compiledTags: any[] = result._tag === 'Ok' ? [...result.tags] : []
  const render = () => {
    const head = createHead({ disableDefaults: true })
    head.push(compiledTags, { values: ['t'] })
    return renderSSRHead(head).headTags
  }
  render()
  expect(render()).toBe('<title>t</title>\n<meta name="x" content="static">')
  compiledTags[1] = ['meta', { name: 'x', content: 'changed' }, 100, 'meta:x', 0, 1]
  return render().includes('static')
}

it('uses the memo for a route first seen after the cap', () => {
  expect(routeUsesMemo()).toBe(true)
  throwaway(2100)
  expect(routeUsesMemo()).toBe(true)
})

it('stops memoizing once the trie keeps filling up', () => {
  // far past the fourth drop, which ends the memo for good
  throwaway(10_000)
  expect(routeUsesMemo()).toBe(false)
})

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
