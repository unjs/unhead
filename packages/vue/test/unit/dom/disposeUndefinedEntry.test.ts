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

// When `clientUseHead` runs while its owning effect scope has already been
// stopped, the `watchEffect` is inert: its scheduled initial job sees the
// effect's active flag cleared and bails, so `head.push` never runs and the
// `entry` stays `undefined`. `clientUseHead` then returns `entry!` — a lie —
// and `onBeforeUnmount` would call `entry.dispose()` on `undefined`, throwing
// "Cannot read properties of undefined (reading 'dispose')".
//
// The fix guards the source: a dead scope returns a no-op entry, so the
// `ActiveHeadEntry` contract holds for every consumer (the unmount hook, the
// `<Head>` component's `entry.patch`, and any external caller of the return).
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

  // Documents the production-shaped scenario the fix targets: a `<script setup>`
  // component with a top-level await (compiled with `withAsyncContext`) torn down
  // mid-suspension. The scope is restored stopped after the await, so head is
  // silently skipped rather than crashing — the no-op entry keeps it safe.
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
