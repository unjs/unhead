import { describe, expect, it, vi } from 'vitest'
import { canUseCompiledProfile, V4PlanTransform } from '../src/unplugin/V4PlanTransform'

const serverCtx = { environment: { config: { consumer: 'server' } } }

describe('v4 plan transform: compiled-profile gating', () => {
  it('reports a compiled entry once it is sealed into a plan', async () => {
    const reportEntry = vi.fn()
    const plugin = V4PlanTransform.vite({ reportEntry }) as any
    await plugin.transform.handler.call(serverCtx, [
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `useHead({ title: 'Home' })`,
    ].join('\n'), '/app/pages/index.ts')

    expect(reportEntry).toHaveBeenCalledExactlyOnceWith({ compiled: true, id: '/app/pages/index.ts' })
  })

  it('reports a bailed entry for dynamic input on a trusted call', async () => {
    const reportEntry = vi.fn()
    const plugin = V4PlanTransform.vite({ reportEntry }) as any
    await plugin.transform.handler.call(serverCtx, [
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `function f(dynamic) { useHead({ title: dynamic }) }`,
    ].join('\n'), '/app/pages/dynamic.ts')

    expect(reportEntry).toHaveBeenCalledExactlyOnceWith({ compiled: false, id: '/app/pages/dynamic.ts' })
  })

  it('reports a bailed entry for a shape emitEntryPlan itself rejects (titleTemplate)', async () => {
    const reportEntry = vi.fn()
    const plugin = V4PlanTransform.vite({ reportEntry }) as any
    await plugin.transform.handler.call(serverCtx, [
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `useHead({ titleTemplate: '%s | Site' })`,
    ].join('\n'), '/app/pages/template.ts')

    expect(reportEntry).toHaveBeenCalledExactlyOnceWith({ compiled: false, id: '/app/pages/template.ts' })
  })

  it('does not report calls to untrusted useHead imports', async () => {
    const reportEntry = vi.fn()
    const plugin = V4PlanTransform.vite({ reportEntry }) as any
    await plugin.transform.handler.call(serverCtx, [
      `import { useHead } from 'other'`,
      `useHead({ title: 'Static' })`,
    ].join('\n'), '/app/pages/other.ts')

    expect(reportEntry).not.toHaveBeenCalled()
  })

  it('reports every trusted call site in a module with a mix of outcomes', async () => {
    const reportEntry = vi.fn()
    const plugin = V4PlanTransform.vite({ reportEntry }) as any
    await plugin.transform.handler.call(serverCtx, [
      `import { useHead } from '@unhead/vue/v4/compiled'`,
      `useHead({ title: 'Home' })`,
      `function f(dynamic) { useHead({ title: dynamic }) }`,
    ].join('\n'), '/app/pages/mixed.ts')

    expect(reportEntry).toHaveBeenCalledTimes(2)
    expect(reportEntry).toHaveBeenNthCalledWith(1, { compiled: true, id: '/app/pages/mixed.ts' })
    expect(reportEntry).toHaveBeenNthCalledWith(2, { compiled: false, id: '/app/pages/mixed.ts' })
  })
})

describe('canUseCompiledProfile', () => {
  it('is false with zero trusted call sites (nothing to gate on)', () => {
    expect(canUseCompiledProfile({ bailed: 0, trusted: 0 })).toBe(false)
  })

  it('is true when every trusted call site compiled', () => {
    expect(canUseCompiledProfile({ bailed: 0, trusted: 5 })).toBe(true)
  })

  it('is false when any trusted call site bailed', () => {
    expect(canUseCompiledProfile({ bailed: 1, trusted: 5 })).toBe(false)
  })
})
