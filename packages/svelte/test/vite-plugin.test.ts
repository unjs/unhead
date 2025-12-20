import { describe, expect, it } from 'vitest'
import { unheadSveltePlugin } from '../src/stream/vite'

describe('unheadSveltePlugin', () => {
  const plugin = unheadSveltePlugin() as any

  describe('basic configuration', () => {
    it('has correct name', () => {
      expect(plugin.name).toBe('unhead:svelte')
    })

    it('enforces pre order', () => {
      expect(plugin.enforce).toBe('pre')
    })
  })

  describe('transform', () => {
    it('skips non-svelte files', () => {
      const result = plugin.transform!('useHead({})', 'file.ts')
      expect(result).toBeNull()
    })

    it('skips files without useHead', () => {
      const code = `
        <script>
          let name = 'world'
        </script>
        <div>Hello {name}</div>
      `
      const result = plugin.transform!(code, 'component.svelte')
      expect(result).toBeNull()
    })

    it('injects HeadStreamScript after script tag', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
        </script>
        <div>Hello</div>
      `
      const result = plugin.transform!(code, 'component.svelte')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('{@html HeadStreamScript()}')
    })

    it('adds HeadStreamScript import from client for non-SSR builds', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
        </script>
        <div>Hello</div>
      `
      const result = plugin.transform!(code, 'component.svelte', { ssr: false })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('import { HeadStreamScript } from \'@unhead/svelte/client\'')
    })

    it('adds HeadStreamScript import from server for SSR builds', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
        </script>
        <div>Hello</div>
      `
      const result = plugin.transform!(code, 'component.svelte', { ssr: true })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('import { HeadStreamScript } from \'@unhead/svelte/server\'')
    })

    it('adds HeadStreamScript to existing server import for SSR builds', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          import { createStreamableHead } from '@unhead/svelte/server'
          useHead({ title: 'Test' })
        </script>
        <div>Hello</div>
      `
      const result = plugin.transform!(code, 'component.svelte', { ssr: true })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('createStreamableHead, HeadStreamScript')
    })

    it('transforms files with useSeoMeta', () => {
      const code = `
        <script>
          import { useSeoMeta } from '@unhead/svelte'
          useSeoMeta({ title: 'Test' })
        </script>
        <div>Hello</div>
      `
      const result = plugin.transform!(code, 'component.svelte')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('{@html HeadStreamScript()}')
    })

    it('generates source map', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
        </script>
        <div>Hello</div>
      `
      const result = plugin.transform!(code, 'component.svelte')
      expect(result).not.toBeNull()
      expect(result!.map).toBeDefined()
    })
  })
})
