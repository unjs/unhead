import type { HeadValidationRule } from 'unhead/plugins'
import { renderSSRHead } from '@unhead/ssr'
import { createHead } from '@unhead/vue/server'
import { ValidatePlugin } from 'unhead/plugins'
import { describe, expect, it } from 'vitest'
import { computed, ref } from 'vue'

function createValidationHead() {
  const rules: HeadValidationRule[] = []
  const head = createHead({
    disableDefaults: true,
    plugins: [ValidatePlugin({
      onReport: diagnostics => rules.push(...diagnostics),
    })],
  })
  return { head, rules }
}

describe('validatePlugin input shapes', () => {
  it('validates Vue computed values after resolver unwrapping', () => {
    const { head, rules } = createValidationHead()
    const nestedMeta = computed(() => [{ name: 'description', content: 'Hello' }])
    const bodyAttrs = computed(() => ({
      meta: nestedMeta,
      title: 'Tooltip',
    }))

    head.push(computed(() => ({ bodyAttrs })) as any)
    renderSSRHead(head)

    expect(rules.filter(rule => rule.id === 'invalid-input-shape')).toHaveLength(1)
  })

  it('validates computed top-level head field shapes after resolver unwrapping', () => {
    const { head, rules } = createValidationHead()
    let getterCalls = 0
    const meta = computed(() => {
      getterCalls++
      return { name: 'description', content: 'Hello' }
    })

    head.push(computed(() => ({ meta })) as any)
    renderSSRHead(head)

    expect(rules.filter(rule => rule.id === 'invalid-input-shape')).toHaveLength(1)
    expect(getterCalls).toBe(1)
  })

  it('accepts computed values that resolve to valid attribute shapes', () => {
    const { head, rules } = createValidationHead()
    const bodyAttrs = computed(() => ({
      meta: computed(() => 'custom-value'),
      style: computed(() => ({ color: 'red' })),
      title: computed(() => 'Tooltip'),
    }))

    head.push({ bodyAttrs } as any)
    renderSSRHead(head)

    expect(rules.find(rule => rule.id === 'invalid-input-shape')).toBeUndefined()
  })

  it('validates root and nested Vue refs after resolver unwrapping', () => {
    const { head, rules } = createValidationHead()
    const nestedMeta = ref([{ name: 'description', content: 'Hello' }])
    const bodyAttrs = ref({
      meta: nestedMeta,
      title: ref('Tooltip'),
    })

    head.push(ref({ bodyAttrs }) as any)
    renderSSRHead(head)

    expect(rules.filter(rule => rule.id === 'invalid-input-shape')).toHaveLength(1)
  })
})
