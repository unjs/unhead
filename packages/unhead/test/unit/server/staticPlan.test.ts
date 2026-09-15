import type { StaticPlanTag } from '../../../src/types'
import { describe, expect, it } from 'vitest'
import { createHead, pushStaticPlan, renderSSRHead } from '../../../src/server'

describe('pushStaticPlan', () => {
  it('splices plan tags into the render ordered by weight alongside normal entries', () => {
    const head = createHead({ disableDefaults: true })
    pushStaticPlan(head, [
      [20, 'link:preconnect:https://static.example.com', '<link rel="preconnect" href="https://static.example.com">'],
      [90, 'meta:og:title', '<meta property="og:title" content="Static Title">'],
    ])
    head.push({ meta: [{ name: 'description', content: 'hi' }] })

    const { headTags } = renderSSRHead(head)
    const preconnectAt = headTags.indexOf('preconnect')
    const ogTitleAt = headTags.indexOf('og:title')
    const descriptionAt = headTags.indexOf('description')
    expect(preconnectAt).toBeGreaterThanOrEqual(0)
    expect(ogTitleAt).toBeGreaterThan(preconnectAt)
    expect(descriptionAt).toBeGreaterThan(ogTitleAt)
  })

  it('emits plan html verbatim instead of re-serialising it', () => {
    const head = createHead({ disableDefaults: true })
    pushStaticPlan(head, [
      [50, 'meta:describes-verbatim', '<meta name="describes-verbatim" content="literal output, not re-serialized">'],
    ])

    expect(renderSSRHead(head).headTags).toBe('<meta name="describes-verbatim" content="literal output, not re-serialized">')
  })

  it('dedupes against a normal entry sharing the same identity using standard weight rules', () => {
    const head = createHead({ disableDefaults: true })
    // lower weight than the default meta weight (100), so the plan tag should win
    pushStaticPlan(head, [
      [90, 'meta:og:title', '<meta property="og:title" content="Plan Title">'],
    ])
    head.push({ meta: [{ property: 'og:title', content: 'Normal Title' }] })

    const { headTags } = renderSSRHead(head)
    expect(headTags).toBe('<meta property="og:title" content="Plan Title">')
    expect(headTags).not.toContain('Normal Title')
  })

  it('merges htmlAttrs/bodyAttrs plan rows with normal attrs', () => {
    const head = createHead({ disableDefaults: true })
    pushStaticPlan(head, [
      [10, 'htmlAttrs:plan', ' data-plan="true"', 3],
      [10, 'bodyAttrs:plan', ' data-body-plan="true"', 4],
    ])
    head.push({ htmlAttrs: { lang: 'en' }, bodyAttrs: { class: 'dark' } })

    const result = renderSSRHead(head)
    expect(result.htmlAttrs).toBe(' lang="en" data-plan="true"')
    expect(result.bodyAttrs).toBe(' class="dark" data-body-plan="true"')
  })

  it('splices body-open and body-close positions', () => {
    const head = createHead({ disableDefaults: true })
    pushStaticPlan(head, [
      [10, 'noscript:body-open-marker', '<noscript data-slot="open"></noscript>', 1],
      [10, 'noscript:body-close-marker', '<noscript data-slot="close"></noscript>', 2],
    ])

    const result = renderSSRHead(head)
    expect(result.bodyTagsOpen).toBe('<noscript data-slot="open"></noscript>')
    expect(result.bodyTags).toBe('<noscript data-slot="close"></noscript>')
  })

  it('renders identical output across two heads sharing one frozen plan const', () => {
    const PLAN: readonly StaticPlanTag[] = Object.freeze([
      [10, 'meta:shared', '<meta name="shared" content="x">', 0],
    ])

    const makeHead = () => {
      const head = createHead({ disableDefaults: true })
      pushStaticPlan(head, PLAN)
      return head
    }

    const headA = makeHead()
    const headB = makeHead()
    const firstA = renderSSRHead(headA)
    const firstB = renderSSRHead(headB)
    // re-render headA after headB has rendered from the same plan const
    const secondA = renderSSRHead(headA)

    expect(firstA).toEqual(firstB)
    expect(firstA).toEqual(secondA)
    expect(PLAN.length).toBe(1)
  })

  it('respects omitLineBreaks between plan and normal tags', () => {
    const head = createHead({ disableDefaults: true, omitLineBreaks: true })
    pushStaticPlan(head, [
      [10, 'meta:one', '<meta name="one" content="1">'],
    ])
    head.push({ meta: [{ name: 'two', content: '2' }] })

    expect((head.render() as any).headTags).toBe('<meta name="one" content="1"><meta name="two" content="2">')
  })

  it('patch() throws: static plan entries are immutable', () => {
    const head = createHead({ disableDefaults: true })
    const entry = pushStaticPlan(head, [[10, 'meta:x', '<meta name="x" content="1">']])
    expect(() => entry.patch({} as any)).toThrow()
  })

  it('dispose() removes the plan entry', () => {
    const head = createHead({ disableDefaults: true })
    const entry = pushStaticPlan(head, [[10, 'meta:x', '<meta name="x" content="1">']])
    entry.dispose()
    expect(renderSSRHead(head).headTags).toBe('')
  })
})
