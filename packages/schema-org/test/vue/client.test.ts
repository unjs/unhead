// @vitest-environment jsdom
import type { UseSchemaOrgInput } from '@unhead/schema-org/vue'
import type { ActiveHeadEntry } from 'unhead/types'
import { defineWebPage, useSchemaOrg } from '@unhead/schema-org/vue'
import { createHead } from '@unhead/vue/client'
import { describe, expect, it, vi } from 'vitest'
import { computed, createApp, h, nextTick, ref } from 'vue'

describe('schema.org Vue client patches', () => {
  it.each(['ref', 'getter', 'computed'] as const)('tracks replacement %s arrays without restoring the original input', async (kind) => {
    const head = createHead({ document })
    const original = ref([defineWebPage({ name: 'Original' })])
    const replacement = ref([defineWebPage({ name: 'Patched' })])
    const patch = kind === 'ref' ? replacement : kind === 'getter' ? () => replacement.value : computed(() => replacement.value)
    let entry!: ActiveHeadEntry<UseSchemaOrgInput>
    const app = createApp({
      setup() {
        entry = useSchemaOrg(original)
        return () => h('div')
      },
    })
    const root = document.createElement('div')
    document.body.append(root)
    app.use(head)
    app.mount(root)

    const names = () => {
      const script = document.querySelector('script[type="application/ld+json"]')
      return script ? JSON.parse(script.textContent!)['@graph'].map((node: { name?: string }) => node.name) : []
    }

    try {
      await vi.waitFor(() => expect(names()).toEqual(['Original']))
      entry.patch(patch)
      await vi.waitFor(() => expect(names()).toEqual(['Patched']))

      replacement.value = [defineWebPage({ name: 'Updated patch' })]
      await vi.waitFor(() => expect(names()).toEqual(['Updated patch']))

      original.value = [defineWebPage({ name: 'Changed original' })]
      await nextTick()
      await new Promise<void>(resolve => setTimeout(resolve, 0))
      expect(names()).toEqual(['Updated patch'])

      replacement.value = []
      await vi.waitFor(() => expect(names()).toEqual([]))
      replacement.value = [defineWebPage({ name: 'Restored patch' })]
      await vi.waitFor(() => expect(names()).toEqual(['Restored patch']))
    }
    finally {
      app.unmount()
      root.remove()
      await vi.waitFor(() => expect(names()).toEqual([]))
    }
  })
})
