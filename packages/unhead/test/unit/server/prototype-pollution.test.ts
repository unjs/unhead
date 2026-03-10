import { describe, expect, it } from 'vitest'
import { renderSSRHead } from '../../../src/server'
import { createServerHeadWithContext } from '../../util'

describe('prototype pollution', () => {
  it('strips __proto__ from meta props', async () => {
    const head = createServerHeadWithContext()
    head.push({
      meta: [
        JSON.parse('{"name":"description","content":"safe","__proto__":{"polluted":true}}'),
      ],
    })
    await renderSSRHead(head)
    expect(({} as any).polluted).toBeUndefined()
  })

  it('strips constructor from meta props', async () => {
    const head = createServerHeadWithContext()
    head.push({
      meta: [
        { name: 'description', content: 'safe', constructor: { prototype: { polluted: true } } } as any,
      ],
    })
    await renderSSRHead(head)
    expect(({} as any).polluted).toBeUndefined()
  })

  it('strips prototype from meta props', async () => {
    const head = createServerHeadWithContext()
    head.push({
      meta: [
        { name: 'description', content: 'safe', prototype: { polluted: true } } as any,
      ],
    })
    await renderSSRHead(head)
    expect(({} as any).polluted).toBeUndefined()
  })

  it('strips __proto__ from htmlAttrs', async () => {
    const head = createServerHeadWithContext()
    head.push({
      htmlAttrs: JSON.parse('{"lang":"en","__proto__":{"polluted":true}}'),
    })
    await renderSSRHead(head)
    expect(({} as any).polluted).toBeUndefined()
  })

  it('strips __proto__ from bodyAttrs', async () => {
    const head = createServerHeadWithContext()
    head.push({
      bodyAttrs: JSON.parse('{"class":"dark","__proto__":{"polluted":true}}'),
    })
    await renderSSRHead(head)
    expect(({} as any).polluted).toBeUndefined()
  })

  it('strips __proto__ from script props', async () => {
    const head = createServerHeadWithContext()
    head.push({
      script: [
        JSON.parse('{"src":"https://example.com/app.js","__proto__":{"polluted":true}}'),
      ],
    })
    await renderSSRHead(head)
    expect(({} as any).polluted).toBeUndefined()
  })

  it('strips __proto__ from link props', async () => {
    const head = createServerHeadWithContext()
    head.push({
      link: [
        JSON.parse('{"rel":"stylesheet","href":"/style.css","__proto__":{"polluted":true}}'),
      ],
    })
    await renderSSRHead(head)
    expect(({} as any).polluted).toBeUndefined()
  })

  it('preserves valid props while stripping dangerous keys', async () => {
    const head = createServerHeadWithContext()
    head.push({
      meta: [
        JSON.parse('{"name":"description","content":"hello","__proto__":{"polluted":true}}'),
      ],
    })
    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toContain('name="description"')
    expect(ctx.headTags).toContain('content="hello"')
    expect(ctx.headTags).not.toContain('__proto__')
    expect(ctx.headTags).not.toContain('polluted')
  })

  it('strips nested __proto__ in style objects', async () => {
    const head = createServerHeadWithContext()
    head.push({
      htmlAttrs: {
        style: JSON.parse('{"color":"red","__proto__":{"polluted":true}}'),
      } as any,
    })
    await renderSSRHead(head)
    expect(({} as any).polluted).toBeUndefined()
  })
})
