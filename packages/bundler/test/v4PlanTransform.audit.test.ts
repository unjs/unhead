import { describe, expect, it } from 'vitest'
import { CanonicalPlugin } from '../../unhead/src/v4/plugins'
import { createHead, renderSSRHead } from '../../unhead/src/v4/server'
import { createFrameworkPlugin } from '../src/unplugin/framework'
import { V4PlanTransform } from '../src/unplugin/V4PlanTransform'
import { Unhead } from '../src/unplugin/vite'

const contexts = {
  client: { environment: { config: { consumer: 'client' } } },
  server: { environment: { config: { consumer: 'server' } } },
}

async function transform(code: string, options: any = {}) {
  const plugin = V4PlanTransform.vite(options) as any
  return await plugin.transform.handler.call(contexts.server, code, '/app/page.ts')
}

function readPlan(code: string): unknown[] {
  const pushed: unknown[] = []
  const executable = code.replace(/^import[^\n]*\n?/gm, '')
  // eslint-disable-next-line no-new-func -- transformed fixture is local static source
  new Function('useHead', executable)((plan: unknown) => pushed.push(plan))
  return pushed
}

describe('v4 plan transform audit', () => {
  it('requires the explicit compiled profile through the public factory', () => {
    const shorthand = Unhead({
      devtools: false,
      experimental: { v4Plans: true },
      transformSeoMeta: false,
      treeshake: false,
      validate: false,
    } as any)
    expect(shorthand.some(plugin => plugin.name === 'unhead:v4-plan-transform')).toBe(false)

    const compiled = Unhead({
      devtools: false,
      experimental: { v4Plans: { profile: 'compiled' } },
      transformSeoMeta: false,
      treeshake: false,
      validate: false,
    })
    expect(compiled.some(plugin => plugin.name === 'unhead:v4-plan-transform')).toBe(true)
  })

  it('requires the compiled profile through framework factories too', () => {
    const FrameworkUnhead = createFrameworkPlugin({
      framework: '@unhead/vue',
      streamingPlugin: {
        rollup: () => ({ name: 'stream' }),
        rspack: () => ({ apply() {} }),
        vite: () => ({ name: 'stream' }),
        webpack: () => ({ apply() {} }),
      } as any,
    })
    const shorthand = FrameworkUnhead({ experimental: { v4Plans: true } } as any).rollup()
    const compiled = FrameworkUnhead({ experimental: { v4Plans: { profile: 'compiled' } } }).rollup()

    expect(shorthand.some(plugin => plugin.name === 'unhead:v4-plan-transform')).toBe(false)
    expect(compiled.some(plugin => plugin.name === 'unhead:v4-plan-transform')).toBe(true)
  })

  it('documents that loose-prop resolve plugins cannot rewrite compiled entries', async () => {
    const input = {
      link: [{ href: '/docs?drop=1#fragment', rel: 'canonical' }],
      meta: [{ content: '/og.png', property: 'og:image' }],
    }
    const source = `import { useHead } from '@unhead/vue/v4/compiled'\nuseHead(${JSON.stringify(input)})`
    const result = await transform(source)
    const [plan] = readPlan(result.code)

    const loose = createHead({ disableDefaults: true })
    loose.use(CanonicalPlugin({ canonicalHost: 'https://example.com' }))
    loose.push(input)

    const compiled = createHead({ disableDefaults: true })
    compiled.use(CanonicalPlugin({ canonicalHost: 'https://example.com' }))
    compiled.push(plan)

    expect(renderSSRHead(loose).headTags).toBe('<link href="https://example.com/docs" rel="canonical"><meta content="https://example.com/og.png" property="og:image">')
    expect(renderSSRHead(compiled).headTags).toBe('<link href="/docs?drop=1#fragment" rel="canonical"><meta content="/og.png" property="og:image">')
  })

  it('does not transform type-only, v3 namespace, or shadowed calls', async () => {
    const cases = [
      `import { type useHead } from '@unhead/vue/v4/compiled'\nuseHead({ title: 'type only' })`,
      `import * as head from '@unhead/vue'\nhead.useHead({ title: 'v3' })`,
      `import { useHead } from '@unhead/vue/v4/compiled'\n{ const useHead = (x) => x; useHead({ title: 'local' }) }`,
      `import { useHead } from '@unhead/vue/v4/compiled'\ntry {} catch (useHead) { useHead({ title: 'local' }) }`,
    ]
    for (const code of cases)
      expect(await transform(code)).toBeUndefined()
  })

  it('returns an embedded, non-empty source map for original code', async () => {
    const source = [
      `'use strict'`,
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `const marker = 1`,
      `useHead({ title: 'Mapped' })`,
    ].join('\n')
    const result = await transform(source)

    expect(result.map).toMatchObject({
      sources: ['/app/page.ts'],
      sourcesContent: [source],
      version: 3,
    })
    expect(result.map.mappings.length).toBeGreaterThan(0)
    expect(result.code.indexOf(`'use strict'`)).toBeLessThan(result.code.indexOf('const __unhead_v4_plan_0'))
    expect(result.code).toContain('const marker = 1')
  })
})
