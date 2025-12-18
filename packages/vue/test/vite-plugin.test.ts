import { describe, expect, it, vi } from 'vitest'
import { unheadVuePlugin } from '../src/vite-plugin'

describe('unheadVuePlugin', () => {
  const plugin = unheadVuePlugin()

  describe('basic configuration', () => {
    it('has correct name', () => {
      expect(plugin.name).toBe('unhead-vue')
    })

    it('enforces pre order', () => {
      expect(plugin.enforce).toBe('pre')
    })
  })

  describe('transform', () => {
    it('skips non-vue files', () => {
      const result = plugin.transform!('<Suspense></Suspense>', 'file.ts')
      expect(result).toBeNull()
    })

    it('skips files without <Suspense>', () => {
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
      expect(result).toBeNull()
    })

    it('skips files without useHead when onlyWithUseHead is true', () => {
      const code = `
        <script setup>
        </script>
        <template>
          <Suspense>
            <AsyncComponent />
          </Suspense>
        </template>
      `
      const result = plugin.transform!(code, 'component.vue')
      expect(result).toBeNull()
    })

    it('transforms files without useHead when onlyWithUseHead is false', () => {
      const pluginNoCheck = unheadVuePlugin({ onlyWithUseHead: false })
      const code = `
        <script setup>
        </script>
        <template>
          <Suspense>
            <AsyncComponent />
          </Suspense>
        </template>
      `
      const result = pluginNoCheck.transform!(code, 'component.vue')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('<HeadStream /></Suspense>')
    })

    it('skips files already using HeadStream', () => {
      const code = `
        <script setup>
          import { useHead, HeadStream } from '@unhead/vue/server'
          useHead({ title: 'Test' })
        </script>
        <template>
          <Suspense>
            <AsyncComponent />
            <HeadStream />
          </Suspense>
        </template>
      `
      const result = plugin.transform!(code, 'component.vue')
      expect(result).toBeNull()
    })

    it('injects HeadStream before </Suspense>', () => {
      const code = `
        <script setup>
          import { useHead } from '@unhead/vue'
          useHead({ title: 'Test' })
        </script>
        <template>
          <Suspense>
            <AsyncComponent />
          </Suspense>
        </template>
      `
      const result = plugin.transform!(code, 'component.vue')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('<HeadStream /></Suspense>')
    })

    it('adds HeadStream import from client for non-SSR builds', () => {
      const code = `
        <script setup>
          import { useHead } from '@unhead/vue'
          useHead({ title: 'Test' })
        </script>
        <template>
          <Suspense>
            <AsyncComponent />
          </Suspense>
        </template>
      `
      const result = plugin.transform!(code, 'component.vue', { ssr: false })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('import { HeadStream } from \'@unhead/vue/client\'')
    })

    it('adds HeadStream import from server for SSR builds', () => {
      const code = `
        <script setup>
          import { useHead } from '@unhead/vue'
          useHead({ title: 'Test' })
        </script>
        <template>
          <Suspense>
            <AsyncComponent />
          </Suspense>
        </template>
      `
      const result = plugin.transform!(code, 'component.vue', { ssr: true })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('import { HeadStream } from \'@unhead/vue/server\'')
    })

    it('adds HeadStream to existing server import for SSR builds', () => {
      const code = `
        <script setup>
          import { useHead } from '@unhead/vue/server'
          useHead({ title: 'Test' })
        </script>
        <template>
          <Suspense>
            <AsyncComponent />
          </Suspense>
        </template>
      `
      const result = plugin.transform!(code, 'component.vue', { ssr: true })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('useHead, HeadStream')
    })

    it('handles multiple <Suspense> components', () => {
      const code = `
        <script setup>
          import { useHead } from '@unhead/vue'
          useHead({ title: 'Test' })
        </script>
        <template>
          <div>
            <Suspense>
              <Component1 />
            </Suspense>
            <Suspense>
              <Component2 />
            </Suspense>
          </div>
        </template>
      `
      const result = plugin.transform!(code, 'component.vue')
      expect(result).not.toBeNull()
      const headStreamCount = (result!.code.match(/<HeadStream \/>/g) || []).length
      expect(headStreamCount).toBe(2)
    })

    it('handles nested <Suspense> components', () => {
      const code = `
        <script setup>
          import { useHead } from '@unhead/vue'
          useHead({ title: 'Test' })
        </script>
        <template>
          <Suspense>
            <div>
              <Suspense>
                <InnerComponent />
              </Suspense>
            </div>
          </Suspense>
        </template>
      `
      const result = plugin.transform!(code, 'component.vue')
      expect(result).not.toBeNull()
      const headStreamCount = (result!.code.match(/<HeadStream \/>/g) || []).length
      expect(headStreamCount).toBe(2)
    })

    it('respects exclude option', () => {
      const pluginWithExclude = unheadVuePlugin({ exclude: /excluded\.vue$/ })
      const code = `
        <script setup>
          import { useHead } from '@unhead/vue'
          useHead({ title: 'Test' })
        </script>
        <template>
          <Suspense>
            <AsyncComponent />
          </Suspense>
        </template>
      `
      const result = pluginWithExclude.transform!(code, 'excluded.vue')
      expect(result).toBeNull()
    })

    it('respects custom include option', () => {
      const pluginCustomInclude = unheadVuePlugin({ include: /custom\.vue$/ })
      const code = `
        <script setup>
          import { useHead } from '@unhead/vue'
          useHead({ title: 'Test' })
        </script>
        <template>
          <Suspense>
            <AsyncComponent />
          </Suspense>
        </template>
      `
      // Should not transform regular .vue files
      expect(pluginCustomInclude.transform!(code, 'component.vue')).toBeNull()
      // Should transform custom.vue
      expect(pluginCustomInclude.transform!(code, 'custom.vue')).not.toBeNull()
    })

    it('generates source map', () => {
      const code = `
        <script setup>
          import { useHead } from '@unhead/vue'
          useHead({ title: 'Test' })
        </script>
        <template>
          <Suspense>
            <AsyncComponent />
          </Suspense>
        </template>
      `
      const result = plugin.transform!(code, 'component.vue')
      expect(result).not.toBeNull()
      expect(result!.map).toBeDefined()
    })

    it('logs to console when debug is true', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const debugPlugin = unheadVuePlugin({ debug: true })

      const code = `
        <script setup>
          import { useHead } from '@unhead/vue'
          useHead({ title: 'Test' })
        </script>
        <template>
          <Suspense>
            <AsyncComponent />
          </Suspense>
        </template>
      `
      debugPlugin.transform!(code, 'component.vue')

      expect(consoleSpy).toHaveBeenCalledWith('[unhead-vue] Transformed component.vue')

      consoleSpy.mockRestore()
    })

    it('does not log when debug is false', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const code = `
        <script setup>
          import { useHead } from '@unhead/vue'
          useHead({ title: 'Test' })
        </script>
        <template>
          <Suspense>
            <AsyncComponent />
          </Suspense>
        </template>
      `
      plugin.transform!(code, 'component.vue')

      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})
