import { describe, expect, it, vi } from 'vitest'
import { unheadSveltePlugin } from '../src/vite-plugin'

describe('unheadSveltePlugin', () => {
  const plugin = unheadSveltePlugin()

  describe('basic configuration', () => {
    it('has correct name', () => {
      expect(plugin.name).toBe('unhead-svelte')
    })

    it('enforces pre order', () => {
      expect(plugin.enforce).toBe('pre')
    })
  })

  describe('transform', () => {
    it('skips non-svelte files', () => {
      const code = '{#await promise}{:then data}{/await}'
      expect(plugin.transform!(code, 'file.ts')).toBeNull()
      expect(plugin.transform!(code, 'file.js')).toBeNull()
      expect(plugin.transform!(code, 'file.tsx')).toBeNull()
    })

    it('skips files without {#await}', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
        </script>
        <div>Hello</div>
      `
      expect(plugin.transform!(code, 'component.svelte')).toBeNull()
    })

    it('skips files without useHead when onlyWithUseHead is true', () => {
      const code = `
        <script>
          let promise = fetch('/api')
        </script>
        {#await promise}
          <div>Loading...</div>
        {:then data}
          <div>{data}</div>
        {/await}
      `
      expect(plugin.transform!(code, 'component.svelte')).toBeNull()
    })

    it('transforms files without useHead when onlyWithUseHead is false', () => {
      const plugin = unheadSveltePlugin({ onlyWithUseHead: false })
      const code = `
        <script>
          let promise = fetch('/api')
        </script>
        {#await promise}
          <div>Loading...</div>
        {:then data}
          <div>{data}</div>
        {/await}
      `
      const result = plugin.transform!(code, 'component.svelte')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('HeadStream')
    })

    it('skips files already using HeadStream', () => {
      const code = `
        <script>
          import { useHead, HeadStream } from '@unhead/svelte'
          useHead({ title: 'Test' })
          let promise = fetch('/api')
        </script>
        {#await promise}
          <div>Loading...</div>
        {:then data}
          <div>{data}</div>
          {@html HeadStream()}
        {/await}
      `
      expect(plugin.transform!(code, 'component.svelte')).toBeNull()
    })

    it('injects HeadStream before {/await}', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
          let promise = fetch('/api')
        </script>
        {#await promise}
          <div>Loading...</div>
        {:then data}
          <div>{data}</div>
        {/await}
      `
      const result = plugin.transform!(code, 'component.svelte')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('{@html HeadStream()}{/await}')
    })

    it('adds HeadStream import from client for non-SSR builds', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
          let promise = fetch('/api')
        </script>
        {#await promise}
          <div>Loading...</div>
        {:then data}
          <div>{data}</div>
        {/await}
      `
      const result = plugin.transform!(code, 'component.svelte', { ssr: false })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('import { HeadStream } from \'@unhead/svelte/client\'')
    })

    it('adds HeadStream import from server for SSR builds', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
          let promise = fetch('/api')
        </script>
        {#await promise}
          <div>Loading...</div>
        {:then data}
          <div>{data}</div>
        {/await}
      `
      const result = plugin.transform!(code, 'component.svelte', { ssr: true })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('import { HeadStream } from \'@unhead/svelte/server\'')
    })

    it('adds HeadStream to existing server import for SSR builds', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          import { createStreamableHead } from '@unhead/svelte/server'
          useHead({ title: 'Test' })
          let promise = fetch('/api')
        </script>
        {#await promise}
          <div>Loading...</div>
        {:then data}
          <div>{data}</div>
        {/await}
      `
      const result = plugin.transform!(code, 'component.svelte', { ssr: true })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('createStreamableHead, HeadStream')
    })

    it('handles multiple {#await} blocks', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
          let promise1 = fetch('/api/1')
          let promise2 = fetch('/api/2')
        </script>
        {#await promise1}
          <div>Loading 1...</div>
        {:then data1}
          <div>{data1}</div>
        {/await}
        {#await promise2}
          <div>Loading 2...</div>
        {:then data2}
          <div>{data2}</div>
        {/await}
      `
      const result = plugin.transform!(code, 'component.svelte')
      expect(result).not.toBeNull()
      expect(result!.code.match(/\{@html HeadStream\(\)\}/g)?.length).toBe(2)
    })

    it('handles nested {#await} blocks', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
          let outerPromise = fetch('/api/outer')
          let innerPromise = fetch('/api/inner')
        </script>
        {#await outerPromise}
          <div>Loading outer...</div>
        {:then outerData}
          <div>{outerData}</div>
          {#await innerPromise}
            <div>Loading inner...</div>
          {:then innerData}
            <div>{innerData}</div>
          {/await}
        {/await}
      `
      const result = plugin.transform!(code, 'component.svelte')
      expect(result).not.toBeNull()
      expect(result!.code.match(/\{@html HeadStream\(\)\}/g)?.length).toBe(2)
    })

    it('skips {#await} blocks without {:then}', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
          let promise = fetch('/api')
        </script>
        {#await promise}
          <div>Loading...</div>
        {:catch error}
          <div>{error.message}</div>
        {/await}
      `
      const result = plugin.transform!(code, 'component.svelte')
      expect(result).toBeNull()
    })

    it('respects exclude option', () => {
      const plugin = unheadSveltePlugin({ exclude: /node_modules/ })
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
          let promise = fetch('/api')
        </script>
        {#await promise}
          <div>Loading...</div>
        {:then data}
          <div>{data}</div>
        {/await}
      `
      expect(plugin.transform!(code, 'node_modules/package/component.svelte')).toBeNull()
    })

    it('respects custom include option', () => {
      const plugin = unheadSveltePlugin({ include: /\.stream\.svelte$/ })
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
          let promise = fetch('/api')
        </script>
        {#await promise}
          <div>Loading...</div>
        {:then data}
          <div>{data}</div>
        {/await}
      `
      expect(plugin.transform!(code, 'component.svelte')).toBeNull()
      expect(plugin.transform!(code, 'component.stream.svelte')).not.toBeNull()
    })

    it('generates source map', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
          let promise = fetch('/api')
        </script>
        {#await promise}
          <div>Loading...</div>
        {:then data}
          <div>{data}</div>
        {/await}
      `
      const result = plugin.transform!(code, 'component.svelte')
      expect(result).not.toBeNull()
      expect(result!.map).toBeDefined()
    })

    it('handles {#await} with catch and then', () => {
      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
          let promise = fetch('/api')
        </script>
        {#await promise}
          <div>Loading...</div>
        {:then data}
          <div>{data}</div>
        {:catch error}
          <div>{error.message}</div>
        {/await}
      `
      const result = plugin.transform!(code, 'component.svelte')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('{@html HeadStream()}{/await}')
    })

    it('logs to console when debug is true', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const debugPlugin = unheadSveltePlugin({ debug: true })

      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
          let promise = fetch('/api')
        </script>
        {#await promise}
          <div>Loading...</div>
        {:then data}
          <div>{data}</div>
        {/await}
      `
      debugPlugin.transform!(code, 'component.svelte')

      expect(consoleSpy).toHaveBeenCalledWith('[unhead-svelte] Transformed component.svelte')

      consoleSpy.mockRestore()
    })

    it('does not log when debug is false', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const code = `
        <script>
          import { useHead } from '@unhead/svelte'
          useHead({ title: 'Test' })
          let promise = fetch('/api')
        </script>
        {#await promise}
          <div>Loading...</div>
        {:then data}
          <div>{data}</div>
        {/await}
      `
      plugin.transform!(code, 'component.svelte')

      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})
