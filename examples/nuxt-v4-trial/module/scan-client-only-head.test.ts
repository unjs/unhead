import { describe, expect, it } from 'vitest'
import { scanScriptForClientOnlyHead } from './scan-client-only-head'

describe('scanScriptForClientOnlyHead', () => {
  it('finds no disqualifiers in a fully static page', () => {
    const source = `
<script setup lang="ts">
useSeoMeta({ title: 'About', description: 'static' })
useHead({ link: [{ rel: 'canonical', href: 'https://example.com/about' }] })
</script>
<template><main /></template>
`
    expect(scanScriptForClientOnlyHead('about.vue', source)).toEqual([])
  })

  it('does not flag a top-level (SSR-visible) useHead call', () => {
    const source = `
<script setup lang="ts">
const count = ref(0)
useHead({ title: () => \`Home (\${count.value})\` })
</script>
`
    expect(scanScriptForClientOnlyHead('index.vue', source)).toEqual([])
  })

  it('flags a useHead call inside onMounted', () => {
    const source = `
<script setup lang="ts">
import { onMounted } from 'vue'
useHead({ title: 'Trap' })
onMounted(() => {
  useHead({ meta: [{ name: 'client-injected', content: String(Date.now()) }] })
})
</script>
`
    const findings = scanScriptForClientOnlyHead('trap.vue', source)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatch(/useHead\(\) at trap\.vue:\d+ runs inside onMounted\(\)/)
  })

  it('flags a useSeoMeta call behind an import.meta.client guard', () => {
    const source = `
<script setup lang="ts">
if (import.meta.client) {
  useSeoMeta({ title: 'client only' })
}
</script>
`
    const findings = scanScriptForClientOnlyHead('guarded.vue', source)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatch(/import\.meta\.client\/process\.client guard/)
  })

  it('flags a call inside watch()', () => {
    const source = `
<script setup lang="ts">
const route = useRoute()
watch(() => route.params.id, () => {
  useHead({ title: 'watched' })
})
</script>
`
    expect(scanScriptForClientOnlyHead('watched.vue', source)).toHaveLength(1)
  })

  it('returns no findings when there is no <script setup> block', () => {
    expect(scanScriptForClientOnlyHead('template-only.vue', '<template><main /></template>')).toEqual([])
  })

  it('disqualifies loudly (non-empty finding) instead of silently passing on a parse failure', () => {
    const source = `
<script setup lang="ts">
this is not valid typescript !!! ((((
</script>
`
    const findings = scanScriptForClientOnlyHead('broken.vue', source)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatch(/could not parse/)
  })
})
