// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createApp, defineComponent, getCurrentScope, h, nextTick, ref } from 'vue'
import { createHead, renderDOMHead } from '../../../src/client'
import { Head } from '../../../src/components'
import { useHead, useSeoMeta } from '../../../src/composables'

describe('vue framework lifecycle', () => {
  it('returns a usable entry from a stopped scope', () => {
    const head = createHead({ document })
    let entry: ReturnType<typeof useHead> | undefined
    const app = createApp(defineComponent({
      setup() {
        getCurrentScope()!.stop()
        entry = useHead({ title: 'late' }, { head })
        return () => h('div')
      },
    }))

    app.mount(document.createElement('div'))

    expect(entry).toBeDefined()
    expect(() => entry!.patch({ title: 'ignored' })).not.toThrow()
    expect(() => entry!.dispose()).not.toThrow()
    expect(() => app.unmount()).not.toThrow()
  })

  it('normalizes useSeoMeta patches', async () => {
    const head = createHead({ document })
    let entry: ReturnType<typeof useSeoMeta> | undefined
    const app = createApp(defineComponent({
      setup() {
        entry = useSeoMeta({ description: 'initial' }, { head })
        return () => h('div')
      },
    }))
    app.mount(document.createElement('div'))

    entry!.patch({ description: 'updated', ogTitle: 'Updated OG' })
    await renderDOMHead(head, { document })

    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('updated')
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Updated OG')
    app.unmount()
  })

  it('keeps one Head watcher across rerenders', async () => {
    const css = ref('body { color: blue }')
    const tick = ref(0)
    let entriesUpdated = 0
    const head = createHead({
      document,
      hooks: {
        'entries:updated': () => {
          entriesUpdated++
        },
      },
    })
    const app = createApp(defineComponent({
      render() {
        return h('div', [
          h('span', tick.value),
          h(Head, null, {
            default: () => h('style', null, css.value),
          }),
        ])
      },
    }))
    app.use(head)
    app.mount(document.createElement('div'))
    await nextTick()

    for (let i = 0; i < 3; i++) {
      tick.value++
      await nextTick()
    }
    entriesUpdated = 0
    css.value = 'body { color: green }'
    await nextTick()

    expect(entriesUpdated).toBe(1)
    app.unmount()
  })
})
