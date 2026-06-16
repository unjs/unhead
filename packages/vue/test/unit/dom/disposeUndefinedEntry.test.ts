// @vitest-environment jsdom

import { createHead } from '@unhead/vue/client'
import { describe, expect, it } from 'vitest'
import { createApp, defineComponent, getCurrentScope, h, onBeforeUnmount } from 'vue'
import { useHead } from '../../../src'

describe('dispose undefined entry', () => {
  // Regression for the crash where `useHead` runs while the owning effect scope
  // has already been stopped — e.g. a component whose `setup` resumes after an
  // `await` once a KeepAlive/Suspense teardown has stopped its scope. In that
  // state `clientUseHead`'s `watchEffect` never performs its initial run, so the
  // head `entry` is never created. The `onBeforeUnmount` hook still fires on
  // teardown and previously called `entry.dispose()` on `undefined`, throwing
  // "undefined is not an object (evaluating 'entry.dispose')".
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
})
