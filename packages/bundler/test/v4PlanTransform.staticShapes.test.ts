import { describe, expect, it } from 'vitest'
import { UseSeoMetaTransform } from '../src/unplugin/UseSeoMetaTransform'
import { V4PlanTransform } from '../src/unplugin/V4PlanTransform'

const serverCtx = { environment: { config: { consumer: 'server' } } }

async function transform(code: string, options: any = {}) {
  const plugin = V4PlanTransform.vite(options) as any
  return await plugin.transform.handler.call(serverCtx, code, '/app/page.ts')
}

async function transformSeoMeta(code: string, options: any = {}) {
  const plugin = UseSeoMetaTransform.vite(options) as any
  return await plugin.transform.handler.call(serverCtx, code, '/app/page.ts')
}

describe('v4 plan transform: cheap additional static shapes', () => {
  it('unwraps an `as const` annotation before deciding whether to compile', async () => {
    const result = await transform([
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `useHead({ title: 'Example' } as const)`,
    ].join('\n'))
    expect(result).toBeDefined()
    expect(result.code).toContain('<title>Example</title>')
    expect(result.code).not.toContain('as const')
  })

  it('unwraps a `satisfies` annotation before deciding whether to compile', async () => {
    const result = await transform([
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `useHead({ title: 'Example' } satisfies Record<string, unknown>)`,
    ].join('\n'))
    expect(result).toBeDefined()
    expect(result.code).toContain('<title>Example</title>')
    expect(result.code).not.toContain('satisfies')
  })

  it('keeps a valid source map when an `as const` wrapper is erased', async () => {
    const source = [
      `'use strict'`,
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `const marker = 1`,
      `useHead({ title: 'Mapped' } as const)`,
    ].join('\n')
    const result = await transform(source)
    expect(result.map).toMatchObject({ sources: ['/app/page.ts'], sourcesContent: [source], version: 3 })
    expect(result.map.mappings.length).toBeGreaterThan(0)
    expect(result.code).toContain('const marker = 1')
  })

  it('still bails when the wrapped expression itself is dynamic', async () => {
    const result = await transform([
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `function f(dynamic) { useHead({ title: dynamic } as const) }`,
    ].join('\n'))
    expect(result).toBeUndefined()
  })

  it('supports static useSeoMeta through the compiled composable', async () => {
    const seoMetaCode = [
      `import { useSeoMeta } from '@unhead/vue/v4/compiled'`,
      `useSeoMeta({ title: 'Static', description: 'Compiled SEO' })`,
    ].join('\n')

    const seoResult = await transformSeoMeta(seoMetaCode)
    expect(seoResult).toBeDefined()
    expect(seoResult.code).toContain('useHead({')

    const planResult = await transform(seoResult.code)
    expect(planResult).toBeDefined()
    expect(planResult.code).toContain('<title>Static</title>')
    expect(planResult.code).toContain('content=\\"Compiled SEO\\"')
    expect(planResult.code).not.toContain('unpackSeoMetaInput')
  })
})
