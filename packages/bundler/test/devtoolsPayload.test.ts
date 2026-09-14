import type { HeadValidationRule } from 'unhead/plugins'
import { JSDOM } from 'jsdom'
import { ValidatePlugin } from 'unhead/plugins'
import { createHead, renderSSRHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'
import { devtoolsPlugin } from '../src'

function readPayload(headTags: string) {
  const document = new JSDOM(`<head>${headTags}</head>`).window.document
  const scripts = document.querySelectorAll('script[id="unhead:devtools"]')
  expect(scripts).toHaveLength(1)
  return JSON.parse(scripts[0]!.textContent!)
}

describe('devtools SSR payload', () => {
  it.each([true, false])('keeps diagnostics outside validation with DevTools registered first: %s', (devtoolsFirst) => {
    const rules: HeadValidationRule[] = []
    const validate = ValidatePlugin({ onReport: reports => rules.push(...reports) })
    const devtools = devtoolsPlugin()
    const head = createHead({ disableDefaults: true, plugins: devtoolsFirst ? [devtools, validate] : [validate, devtools] })
    const content = `</script><script>${'a'.repeat(3 * 1024)}`
    head.push({ title: 'Home', meta: [{ name: 'description', content }] })

    const payload = readPayload(renderSSRHead(head).headTags)
    expect(payload.entries[0].input.meta[0].content).toBe(content)
    expect(payload.tags.find((tag: any) => tag.tag === 'meta' && tag.props.name === 'description').props.content).toBe(content)
    expect(rules.filter(rule => rule.id === 'inline-script-size')).toEqual([])

    head.push({ script: [{ id: 'application-script', innerHTML: 'a'.repeat(3 * 1024) }] })
    readPayload(renderSSRHead(head).headTags)
    expect(rules.filter(rule => rule.id === 'inline-script-size').map(rule => rule.tag?.props.id)).toEqual(['application-script'])
  })

  it('does not add diagnostics to supplied resolved tags across renders', () => {
    const head = createHead({ plugins: [devtoolsPlugin()] })
    const resolvedTags = [{ tag: 'title' as const, props: {}, textContent: 'Home' }]
    for (let i = 0; i < 2; i++) {
      const payload = readPayload(renderSSRHead(head, { resolvedTags }).headTags)
      expect(payload.tags.map((tag: any) => tag.tag)).toEqual(['title'])
    }
    expect(resolvedTags.map(tag => tag.tag)).toEqual(['title'])
  })
})
