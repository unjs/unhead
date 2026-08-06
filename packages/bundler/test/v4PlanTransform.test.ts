import { describe, expect, it } from 'vitest'
import { createCore } from '../../unhead/src/v4/core'
import { createHead, renderSSRHead } from '../../unhead/src/v4/server'
import { V4PlanTransform } from '../src/unplugin/V4PlanTransform'
import { Unhead } from '../src/unplugin/vite'

const contexts = {
  client: { environment: { config: { consumer: 'client' } } },
  server: { environment: { config: { consumer: 'server' } } },
}

async function transform(code: string, consumer: keyof typeof contexts = 'server', options: any = {}) {
  const plugin = V4PlanTransform.vite(options) as any
  return await plugin.transform.handler.call(contexts[consumer], code, '/app/page.ts')
}

describe('v4 static plan transform', () => {
  it('is opt in through the public Vite factory', async () => {
    const disabled = Unhead({ devtools: false, transformSeoMeta: false, treeshake: false, validate: false }) as any[]
    expect(disabled.some(plugin => plugin.name === 'unhead:v4-plan-transform')).toBe(false)

    const enabled = Unhead({
      devtools: false,
      experimental: { v4Plans: { profile: 'compiled' } },
      transformSeoMeta: false,
      treeshake: false,
      validate: false,
    }) as any[]
    expect(enabled.some(plugin => plugin.name === 'unhead:v4-plan-transform')).toBe(true)
  })

  it('hoists a server plan and retains the Vue lifecycle composable', async () => {
    const result = await transform([
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `const entry = useHead({ title: 'Static', meta: [{ name: 'description', content: 'Compiled' }] })`,
    ].join('\n'))

    expect(result.code).toContain('const __unhead_v4_plan_0 = [[')
    expect(result.code).toContain('<title>Static</title>')
    expect(result.code).toContain('content=\\"Compiled\\"')
    expect(result.code).toContain('const entry = useHead(__unhead_v4_plan_0)')
    expect(result.code).not.toContain('installPlanRenderer')
  })

  it('matches loose SSR output without calling an L1 compiler', async () => {
    const input = {
      bodyAttrs: { class: 'page' },
      htmlAttrs: { lang: 'fr' },
      link: [{ href: '/canonical', rel: 'canonical' }],
      meta: [{ content: 'Compiled & safe', name: 'description' }],
      title: 'Static <title>',
    }
    const code = `import { useHead } from '@unhead/vue/v4/compiled'\nuseHead(${JSON.stringify(input)})`
    const result = await transform(code)
    const plans: unknown[] = []
    const executable = result.code.replace(/^import[^\n]*\n?/gm, '')
    // eslint-disable-next-line no-new-func -- transformed fixture is local static source
    new Function('useHead', executable)((plan: unknown) => plans.push(plan))

    const loose = createHead({ disableDefaults: true })
    loose.push(input)
    const strict = createCore({ ssr: true })
    strict.push(plans[0])
    expect(renderSSRHead(strict)).toEqual(renderSSRHead(loose))
  })

  it('installs the sealed renderer only in the client output', async () => {
    const result = await transform([
      `import { useHead as setHead } from '@unhead/vue/v4/compiled'`,
      `setHead({ title: 'Static' })`,
    ].join('\n'), 'client', { client: true })

    expect(result.code).toContain(`import { installPlanRenderer as __unhead_v4_install } from 'unhead/v4/client-plans'`)
    expect(result.code).toContain(`import { injectHead as __unhead_v4_inject } from "@unhead/vue/v4/compiled"`)
    expect(result.code).toContain('setHead((__unhead_v4_install(__unhead_v4_inject()),__unhead_v4_plan_0))')
  })

  it('tracks aliases, namespaces, and lexical shadowing precisely', async () => {
    const result = await transform([
      `import { useHead as importedHead } from '@unhead/vue/v4/compiled'`,
      `import * as headApi from '@unhead/vue/v4/compiled'`,
      `function local(importedHead) { importedHead({ title: 'local' }) }`,
      `importedHead({ title: 'direct' })`,
      `headApi.useHead({ title: 'namespace' })`,
    ].join('\n'))

    expect(result.code.match(/const __unhead_v4_plan_/g)).toHaveLength(2)
    expect(result.code).toContain(`importedHead({ title: 'local' })`)
    expect(result.code).toContain('importedHead(__unhead_v4_plan_0)')
    expect(result.code).toContain('headApi.useHead(__unhead_v4_plan_1)')
  })

  it.each([
    `useHead(input)`,
    `useHead({ title: dynamic })`,
    `useHead({ ...head })`,
    `useHead({ [key]: 'value' })`,
    `useHead({ get title() { return 'value' } })`,
    `useHead({ titleTemplate: '%s | Site' })`,
    `useHead({ title: 'value' }, { tagPriority: 1 })`,
  ])('safely leaves unsupported input unchanged: %s', async (call) => {
    const code = `import { useHead } from '@unhead/vue/v4/compiled'\n${call}`
    expect(await transform(code)).toBeUndefined()
  })

  it('does not transform an identically named function from another package', async () => {
    const code = `import { useHead } from 'other'\nuseHead({ title: 'Static' })`
    expect(await transform(code)).toBeUndefined()
  })

  it('does not assume the bare Vue entry is running v4', async () => {
    const code = `import { useHead } from '@unhead/vue'\nuseHead({ title: 'Could be v3' })`
    expect(await transform(code)).toBeUndefined()
    expect((await transform(code, 'server', { importPaths: ['@unhead/vue'] })).code).toContain('<title>Could be v3</title>')
  })

  it('does not assume the loose v4 Vue entry uses a compiled head', async () => {
    const code = `import { useHead } from '@unhead/vue/v4'\nuseHead({ title: 'Loose v4' })`
    expect(await transform(code)).toBeUndefined()
    expect((await transform(code, 'server', { importPaths: ['@unhead/vue/v4'] })).code).toContain('<title>Loose v4</title>')
  })

  it('supports explicitly trusted virtual import paths', async () => {
    const code = `import { useHead } from '#imports'\nuseHead({ title: 'Nuxt' })`
    expect(await transform(code)).toBeUndefined()

    const result = await transform(code, 'server', { importPaths: ['#imports'] })
    expect(result.code).toContain('<title>Nuxt</title>')
  })

  it('uses the configured consumer when transform context has none', async () => {
    const plugin = V4PlanTransform.vite({ consumer: 'server' }) as any
    const result = await plugin.transform.handler.call({}, `import { useHead } from '@unhead/vue/v4/compiled'\nuseHead({ title: 'Static' })`, '/app/page.ts')
    expect(result.code).toContain('<title>Static</title>')
  })

  it('leaves client code unchanged unless client plan rendering is explicit', async () => {
    const code = `import { useHead } from '@unhead/vue/v4/compiled'\nuseHead({ title: 'Static' })`
    expect(await transform(code, 'client')).toBeUndefined()
  })

  it('uses an explicit adapter import for virtual composables', async () => {
    const code = `import { useHead } from '#imports'\nuseHead({ title: 'Nuxt' })`
    const result = await transform(code, 'client', {
      adapterImport: '@unhead/vue',
      client: true,
      importPaths: ['#imports'],
    })
    expect(result.code).toContain(`from "@unhead/vue"`)
    expect(result.code).not.toContain(`injectHead as __unhead_v4_inject } from '#imports'`)
  })
})
