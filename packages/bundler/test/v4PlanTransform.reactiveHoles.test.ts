import { describe, expect, it, vi } from 'vitest'
import { UseSeoMetaTransform } from '../src/unplugin/UseSeoMetaTransform'
import { V4PlanTransform } from '../src/unplugin/V4PlanTransform'

const contexts = {
  client: { environment: { config: { consumer: 'client' } } },
  server: { environment: { config: { consumer: 'server' } } },
}

async function transform(code: string, consumer: keyof typeof contexts = 'server', options: any = {}) {
  const plugin = V4PlanTransform.vite(options) as any
  return await plugin.transform.handler.call(contexts[consumer], code, '/app/page.ts')
}

describe('v4 plan transform: reactive holes', () => {
  it('compiles an eligible getter to a sealed plan plus a call-site fills thunk', async () => {
    const result = await transform([
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `const x = ref('hi')`,
      `useHead({ title: () => x.value, meta: [{ name: 'description', content: () => x.value + '!' }] })`,
    ].join('\n'))

    expect(result.code).toContain('const __unhead_v4_plan_0 = [[')
    // the plan itself carries segment tuples, not the live string
    expect(result.code).toContain('<title>')
    expect(result.code).toContain('<meta name=\\"description\\" content=\\"')
    // the fills thunk stays at the call site, referencing the original scope
    expect(result.code).toContain('useHead(__unhead_v4_plan_0, { fills: () => [x.value,x.value + \'!\'] })')
  })

  it('reports a hole-bearing call as compiled', async () => {
    const reportEntry = vi.fn()
    const plugin = V4PlanTransform.vite({ reportEntry }) as any
    await plugin.transform.handler.call(contexts.server, [
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `useHead({ title: () => x.value })`,
    ].join('\n'), '/app/page.ts')
    expect(reportEntry).toHaveBeenCalledExactlyOnceWith({ compiled: true, id: '/app/page.ts' })
  })

  it('keeps getters at the call site under the sealed client install wrapper', async () => {
    const result = await transform([
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `useHead({ title: () => x.value })`,
    ].join('\n'), 'client', { client: true })

    expect(result.code).toContain('useHead((__unhead_v4_install(__unhead_v4_inject()),__unhead_v4_plan_0), { fills: () => [x.value] })')
  })

  it('compiles useSeoMeta getters through the rewritten useHead call', async () => {
    const seoPlugin = UseSeoMetaTransform.vite({}) as any
    const seoResult = await seoPlugin.transform.handler.call(contexts.server, [
      `import { useSeoMeta } from '@unhead/vue/v4/compiled'`,
      `useSeoMeta({ description: () => x.value })`,
    ].join('\n'), '/app/page.ts')
    expect(seoResult.code).toContain('useHead({')

    const result = await transform(seoResult.code)
    expect(result.code).toContain('fills: () => [x.value]')
  })

  it.each([
    ['block statement body', `useHead({ title: () => { return x.value } })`],
    ['async arrow', `useHead({ title: async () => x.value })`],
    ['arrow with parameters', `useHead({ title: (y) => y })`],
    ['function expression (not an arrow)', `useHead({ title: function () { return x.value } })`],
  ])('bails the whole call to the runtime path: %s', async (_label, call) => {
    const code = `import { useHead } from '@unhead/vue/v4/compiled'\n${call}`
    expect(await transform(code)).toBeUndefined()
  })

  it('a getter in a structurally-critical position (meta name) bails the whole call', async () => {
    const code = [
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `useHead({ meta: [{ name: () => x.value, content: 'c' }] })`,
    ].join('\n')
    expect(await transform(code)).toBeUndefined()
  })

  it('a getter in an identity/config position (key, tagPriority) bails the whole call', async () => {
    expect(await transform([
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `useHead({ script: [{ src: '/x.js', key: () => x.value }] })`,
    ].join('\n'))).toBeUndefined()

    expect(await transform([
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `useHead({ title: 'x' }, { tagPriority: () => x.value })`,
    ].join('\n'))).toBeUndefined()
  })

  it('a getter on link href without a key bails (identity would be dynamic)', async () => {
    const code = [
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `useHead({ link: [{ rel: 'stylesheet', href: () => x.value }] })`,
    ].join('\n')
    expect(await transform(code)).toBeUndefined()
  })

  it('a keyed link tolerates a getter href (identity comes from the static key)', async () => {
    const result = await transform([
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `useHead({ link: [{ rel: 'stylesheet', href: () => x.value, key: 'theme' }] })`,
    ].join('\n'))
    expect(result.code).toContain('fills: () => [x.value]')
  })

  it('preserves multiple getters in source (fill) order for a single entry plan', async () => {
    const result = await transform([
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `useHead({ htmlAttrs: { lang: () => a.value }, title: () => b.value, meta: [{ name: 'description', content: () => c.value }] })`,
    ].join('\n'))
    expect(result.code).toMatch(/fills: \(\) => \[a\.value,b\.value,c\.value\]/)
  })

  it('a mixed static/dynamic object still compiles, only the dynamic value becomes a hole', async () => {
    const result = await transform([
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `useHead({ title: 'Static', meta: [{ name: 'description', content: () => x.value }] })`,
    ].join('\n'))
    expect(result.code).toContain('<title>Static</title>')
    expect(result.code).toContain('fills: () => [x.value]')
  })
})
