// @vitest-environment jsdom

import { createHead } from '@unhead/vue/client'
import { describe, expect, it } from 'vitest'
import * as vue from 'vue'
import {
  createApp,
  defineComponent,
  getCurrentInstance,
  getCurrentScope,
  h,
  nextTick,
  onBeforeUnmount,
  ref,
  Suspense,
} from 'vue'
import { useHead } from '../../../src'
import { Head } from '../../../src/components'

const tick = () => new Promise(resolve => setTimeout(resolve))

// `withAsyncContext` is the compiler-internal helper emitted for `<script setup>`
// top-level awaits; it isn't part of vue's public types, so reach it via a cast.
const withAsyncContext = (vue as unknown as {
  withAsyncContext: <T>(getAwaitable: () => T) => [T, () => void]
}).withAsyncContext

// In a dead scope the watchEffect is inert, so no entry gets pushed and
// clientUseHead used to return `entry!` (undefined), crashing on dispose/patch.
// The fix returns a no-op entry, keeping the ActiveHeadEntry contract for every
// consumer: the unmount hook, the <Head> component's patch, and external callers.
describe('dispose undefined entry', () => {
  it('does not throw on unmount when the scope was stopped before the entry was created', () => {
    const head = createHead({ document })

    let beforeUnmountFired = false

    const Comp = defineComponent({
      setup() {
        // Stop the component's scope before registering head, reproducing the
        // teardown-during-async-setup race. A watchEffect created now is inert,
        // so `entry` inside clientUseHead stays undefined.
        getCurrentScope()!.stop()

        // pass `head` explicitly so resolution doesn't depend on inject context
        useHead({ title: 'page' }, { head })

        onBeforeUnmount(() => {
          beforeUnmountFired = true
        })

        return () => h('div', 'hello')
      },
    })

    const el = document.createElement('div')
    const app = createApp(Comp)
    app.use(head)
    app.mount(el)

    expect(() => app.unmount()).not.toThrow()
    // guard: ensure the teardown hook actually ran, otherwise the test proves nothing
    expect(beforeUnmountFired).toBe(true)
  })

  it('returns a usable entry so external callers never receive undefined', () => {
    const head = createHead({ document })

    let returned: ReturnType<typeof useHead> | undefined

    const Comp = defineComponent({
      setup() {
        getCurrentScope()!.stop()
        returned = useHead({ title: 'page' }, { head })
        return () => h('div')
      },
    })

    const app = createApp(Comp)
    app.use(head)
    app.mount(document.createElement('div'))

    expect(returned).toBeDefined()
    // a caller using the return value must not crash on the dead-scope path
    expect(() => returned!.patch({ title: 'x' })).not.toThrow()
    expect(() => returned!.dispose()).not.toThrow()

    app.unmount()
  })

  it('does not throw when the <Head> component renders in a dead scope', () => {
    const head = createHead({ document })

    const Comp = defineComponent({
      setup() {
        getCurrentScope()!.stop()
        return () => h(Head, null, { default: () => h('title', 'x') })
      },
    })

    const app = createApp(Comp)
    app.use(head)
    app.mount(document.createElement('div'))

    expect(() => app.unmount()).not.toThrow()
  })

  it('still applies head normally when the scope is active', async () => {
    const head = createHead({ document })

    const Comp = defineComponent({
      setup() {
        useHead({ title: 'real' }, { head })
        return () => h('div')
      },
    })

    const app = createApp(Comp)
    app.use(head)
    app.mount(document.createElement('div'))

    await tick()
    expect(document.title).toBe('real')

    app.unmount()
  })

  // Production-shaped scenario: a `<script setup>` with a top-level await
  // (compiled to `withAsyncContext`) torn down mid-suspension. The scope resumes
  // stopped, so head is skipped instead of crashing.
  it('does not throw on a withAsyncContext teardown race', async () => {
    const head = createHead({ document })

    let resolveGate: () => void
    const gate = new Promise<void>((resolve) => {
      resolveGate = resolve
    })
    let scopeActiveAtUseHead: boolean | undefined
    let threw: unknown

    const AsyncSfc = defineComponent({
      async setup() {
        // matches the SFC compiler output for `await gate`
        const [__temp, __restore] = withAsyncContext(() => gate)
        await __temp
        __restore()

        scopeActiveAtUseHead = getCurrentScope()?.active
        // sanity: the instance context is restored too
        expect(getCurrentInstance()).toBeTruthy()
        try {
          useHead({ title: 'late' }, { head })
        }
        catch (error) {
          threw = error
        }
        return () => h('div')
      },
    })

    const show = ref(true)
    const Parent = defineComponent({
      setup() {
        return () =>
          show.value
            ? h(Suspense, null, { default: () => h(AsyncSfc), fallback: () => h('span', '...') })
            : h('div', 'gone')
      },
    })

    const app = createApp(Parent)
    app.use(head)
    app.mount(document.createElement('div'))
    await nextTick()

    // navigate away before the await resolves, then resume into the dead scope
    show.value = false
    await nextTick()
    resolveGate!()
    await tick()
    await nextTick()

    expect(scopeActiveAtUseHead).toBe(false)
    expect(threw).toBeUndefined()
  })
})
