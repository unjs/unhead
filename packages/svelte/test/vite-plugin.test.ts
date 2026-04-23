import { describe, expect, it } from 'vitest'
import { unheadSvelteStreamingPlugin } from '../src/stream/plugin'

const FILTER_RE = /\.svelte$/

describe('unheadSvelteStreamingPlugin', () => {
  const plugin = unheadSvelteStreamingPlugin.vite() as any
  const transform = plugin.transform.handler

  describe('basic configuration', () => {
    it('has correct name', () => {
      expect(plugin.name).toBe('@unhead/svelte:streaming')
    })

    it('enforces pre order', () => {
      expect(plugin.enforce).toBe('pre')
    })
  })

  describe('transform', () => {
    it('filters to .svelte files only', () => {
      expect(plugin.transform.filter.id).toEqual(FILTER_RE)
    })

    it('skips files without useHead', () => {
      const code = `
        <script>
          let name = 'world'
        </script>
        <div>Hello {name}</div>
      `
      const result = transform(code, 'component.svelte')
      expect(result).toBeNull()
    })

    it('injects HeadStream after script tag', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
        </script>
        <div>Hello</div>
      `
      const result = transform(code, 'component.svelte')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('{@html HeadStream()}')
    })

    it('adds HeadStream import from client for non-SSR builds', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
        </script>
        <div>Hello</div>
      `
      const result = transform(code, 'component.svelte', { ssr: false })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('import { HeadStream } from \'@unhead/svelte/stream/client\'')
    })

    it('adds HeadStream import from server for SSR builds', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
        </script>
        <div>Hello</div>
      `
      const result = transform(code, 'component.svelte', { ssr: true })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('import { HeadStream } from \'@unhead/svelte/stream/server\'')
    })

    it('adds HeadStream to existing server import for SSR builds', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          import { createStreamableHead } from '@unhead/svelte/stream/server'
          useHead({ title: 'Test' })
        </script>
        <div>Hello</div>
      `
      const result = transform(code, 'component.svelte', { ssr: true })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('createStreamableHead, HeadStream')
    })

    it('transforms files with useSeoMeta', () => {
      const code = `
        <script>
          import { useSeoMeta } from '@unhead/svelte'
          useSeoMeta({ title: 'Test' })
        </script>
        <div>Hello</div>
      `
      const result = transform(code, 'component.svelte')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('{@html HeadStream()}')
    })

    it('generates source map', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
        </script>
        <div>Hello</div>
      `
      const result = transform(code, 'component.svelte')
      expect(result).not.toBeNull()
      expect(result!.map).toBeDefined()
    })
  })
})
