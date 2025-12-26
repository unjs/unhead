import { describe, expect, it } from 'vitest'
import { unheadVuePlugin } from '../src/stream/vite'

describe('unheadVuePlugin', () => {
  const plugin = unheadVuePlugin() as any

  describe('basic configuration', () => {
    it('has correct name', () => {
      expect(plugin.name).toBe('@unhead/vue:streaming')
    })

    it('enforces pre order', () => {
      expect(plugin.enforce).toBe('pre')
    })
  })

  describe('transform', () => {
    it('skips non-vue files', () => {
      const result = plugin.transform!('useHead({})', 'file.ts')
      expect(result).toBeNull()
    })

    it('skips files without useHead', () => {
      const code = `
        <script setup>
        </script>
        <template>
          <div>Hello</div>
        </template>
      `
      const result = plugin.transform!(code, 'component.vue')
      expect(result).toBeNull()
    })

    it('injects HeadStream in template for components with useHead', () => {
      const code = `
        <script setup>
          import { useHead } from '@unhead/vue'
          useHead({ title: 'Test' })
        </script>
        <template>
          <div>Hello</div>
        </template>
      `
      const result = plugin.transform!(code, 'component.vue')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('<HeadStream />')
    })

    it('adds HeadStream import from client for non-SSR builds', () => {
      const code = `
        <script setup>
          import { useHead } from '@unhead/vue'
          useHead({ title: 'Test' })
        </script>
        <template>
          <div>Hello</div>
        </template>
      `
      const result = plugin.transform!(code, 'component.vue', { ssr: false })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('import { HeadStream } from \'@unhead/vue/stream/client\'')
    })

    it('adds HeadStream import from server for SSR builds', () => {
      const code = `
        <script setup>
          import { useHead } from '@unhead/vue'
          useHead({ title: 'Test' })
        </script>
        <template>
          <div>Hello</div>
        </template>
      `
      const result = plugin.transform!(code, 'component.vue', { ssr: true })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('import { HeadStream } from \'@unhead/vue/stream/server\'')
    })

    it('adds HeadStream to existing server import for SSR builds', () => {
      const code = `
        <script setup>
          import { useHead } from '@unhead/vue/stream/server'
          useHead({ title: 'Test' })
        </script>
        <template>
          <div>Hello</div>
        </template>
      `
      const result = plugin.transform!(code, 'component.vue', { ssr: true })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('useHead, HeadStream')
    })

    it('transforms files with useSeoMeta', () => {
      const code = `
        <script setup>
          import { useSeoMeta } from '@unhead/vue'
          useSeoMeta({ title: 'Test' })
        </script>
        <template>
          <div>Hello</div>
        </template>
      `
      const result = plugin.transform!(code, 'component.vue')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('<HeadStream />')
    })

    it('generates source map', () => {
      const code = `
        <script setup>
          import { useHead } from '@unhead/vue'
          useHead({ title: 'Test' })
        </script>
        <template>
          <div>Hello</div>
        </template>
      `
      const result = plugin.transform!(code, 'component.vue')
      expect(result).not.toBeNull()
      expect(result!.map).toBeDefined()
    })
  })
})
