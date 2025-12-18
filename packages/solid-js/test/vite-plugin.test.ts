import { describe, expect, it, vi } from 'vitest'
import { unheadSolidPlugin } from '../src/vite-plugin'

describe('unheadSolidPlugin', () => {
  const plugin = unheadSolidPlugin()

  describe('basic configuration', () => {
    it('has correct name', () => {
      expect(plugin.name).toBe('unhead-solid')
    })

    it('enforces pre order', () => {
      expect(plugin.enforce).toBe('pre')
    })
  })

  describe('transform', () => {
    it('skips non-jsx/tsx files', () => {
      const code = '<Suspense><div /></Suspense>'
      expect(plugin.transform!(code, 'file.ts')).toBeNull()
      expect(plugin.transform!(code, 'file.js')).toBeNull()
      expect(plugin.transform!(code, 'file.vue')).toBeNull()
    })

    it('skips files without Suspense', () => {
      const code = `
        import { useHead } from '@unhead/solid-js'
        export function App() {
          useHead({ title: 'Test' })
          return <div>Hello</div>
        }
      `
      expect(plugin.transform!(code, 'app.tsx')).toBeNull()
    })

    it('skips files without useHead when onlyWithUseHead is true', () => {
      const code = `
        import { Suspense } from 'solid-js'
        export function App() {
          return <Suspense fallback={<div>Loading...</div>}><Child /></Suspense>
        }
      `
      expect(plugin.transform!(code, 'app.tsx')).toBeNull()
    })

    it('transforms files without useHead when onlyWithUseHead is false', () => {
      const plugin = unheadSolidPlugin({ onlyWithUseHead: false })
      const code = `
        import { Suspense } from 'solid-js'
        export function App() {
          return <Suspense fallback={<div>Loading...</div>}><Child /></Suspense>
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('HeadStream')
    })

    it('skips files already using HeadStream', () => {
      const code = `
        import { Suspense } from 'solid-js'
        import { useHead, HeadStream } from '@unhead/solid-js'
        export function App() {
          useHead({ title: 'Test' })
          return <Suspense><Child /><HeadStream /></Suspense>
        }
      `
      expect(plugin.transform!(code, 'app.tsx')).toBeNull()
    })

    it('injects HeadStream before closing Suspense tag', () => {
      const code = `
        import { Suspense } from 'solid-js'
        import { useHead } from '@unhead/solid-js'
        export function App() {
          useHead({ title: 'Test' })
          return <Suspense fallback={<div>Loading</div>}><Child /></Suspense>
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('<HeadStream /></Suspense>')
    })

    it('handles self-closing Suspense tags', () => {
      const code = `
        import { Suspense } from 'solid-js'
        import { useHead } from '@unhead/solid-js'
        export function App() {
          useHead({ title: 'Test' })
          return <Suspense fallback={<div>Loading</div>} />
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('><HeadStream /></Suspense>')
    })

    it('adds HeadStream import from client for non-SSR builds', () => {
      const code = `
        import { Suspense } from 'solid-js'
        import { useHead } from '@unhead/solid-js'
        export function App() {
          useHead({ title: 'Test' })
          return <Suspense><Child /></Suspense>
        }
      `
      const result = plugin.transform!(code, 'app.tsx', { ssr: false })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('import { HeadStream } from \'@unhead/solid-js/client\'')
    })

    it('adds HeadStream import from server for SSR builds', () => {
      const code = `
        import { Suspense } from 'solid-js'
        import { useHead } from '@unhead/solid-js'
        export function App() {
          useHead({ title: 'Test' })
          return <Suspense><Child /></Suspense>
        }
      `
      const result = plugin.transform!(code, 'app.tsx', { ssr: true })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('import { HeadStream } from \'@unhead/solid-js/server\'')
    })

    it('adds HeadStream to existing server import for SSR builds', () => {
      const code = `
        import { Suspense } from 'solid-js'
        import { useHead } from '@unhead/solid-js'
        import { createStreamableHead } from '@unhead/solid-js/server'
        export function App() {
          useHead({ title: 'Test' })
          return <Suspense><Child /></Suspense>
        }
      `
      const result = plugin.transform!(code, 'app.tsx', { ssr: true })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('createStreamableHead, HeadStream')
    })

    it('handles multiple Suspense components', () => {
      const code = `
        import { Suspense } from 'solid-js'
        import { useHead } from '@unhead/solid-js'
        export function App() {
          useHead({ title: 'Test' })
          return (
            <div>
              <Suspense fallback={<div>Loading 1...</div>}>
                <Child1 />
              </Suspense>
              <Suspense fallback={<div>Loading 2...</div>}>
                <Child2 />
              </Suspense>
            </div>
          )
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).not.toBeNull()
      expect(result!.code.match(/<HeadStream \/>/g)?.length).toBe(2)
    })

    it('handles nested Suspense components', () => {
      const code = `
        import { Suspense } from 'solid-js'
        import { useHead } from '@unhead/solid-js'
        export function App() {
          useHead({ title: 'Test' })
          return (
            <Suspense fallback={<div>Outer Loading...</div>}>
              <Suspense fallback={<div>Inner Loading...</div>}>
                <Child />
              </Suspense>
            </Suspense>
          )
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).not.toBeNull()
      expect(result!.code.match(/<HeadStream \/>/g)?.length).toBe(2)
    })

    it('works with .jsx files', () => {
      const code = `
        import { Suspense } from 'solid-js'
        import { useHead } from '@unhead/solid-js'
        export function App() {
          useHead({ title: 'Test' })
          return <Suspense><Child /></Suspense>
        }
      `
      const result = plugin.transform!(code, 'app.jsx')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('HeadStream')
    })

    it('respects exclude option', () => {
      const plugin = unheadSolidPlugin({ exclude: /node_modules/ })
      const code = `
        import { Suspense } from 'solid-js'
        import { useHead } from '@unhead/solid-js'
        export function App() {
          useHead({ title: 'Test' })
          return <Suspense><Child /></Suspense>
        }
      `
      expect(plugin.transform!(code, 'node_modules/package/app.tsx')).toBeNull()
    })

    it('respects custom include option', () => {
      const plugin = unheadSolidPlugin({ include: /\.solid\.tsx$/ })
      const code = `
        import { Suspense } from 'solid-js'
        import { useHead } from '@unhead/solid-js'
        export function App() {
          useHead({ title: 'Test' })
          return <Suspense><Child /></Suspense>
        }
      `
      expect(plugin.transform!(code, 'app.tsx')).toBeNull()
      expect(plugin.transform!(code, 'app.solid.tsx')).not.toBeNull()
    })

    it('generates source map', () => {
      const code = `
        import { Suspense } from 'solid-js'
        import { useHead } from '@unhead/solid-js'
        export function App() {
          useHead({ title: 'Test' })
          return <Suspense><Child /></Suspense>
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).not.toBeNull()
      expect(result!.map).toBeDefined()
    })

    it('logs to console when debug is true', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const debugPlugin = unheadSolidPlugin({ debug: true })

      const code = `
        import { Suspense } from 'solid-js'
        import { useHead } from '@unhead/solid-js'
        export function App() {
          useHead({ title: 'Test' })
          return <Suspense><Child /></Suspense>
        }
      `
      debugPlugin.transform!(code, 'app.tsx')

      expect(consoleSpy).toHaveBeenCalledWith('[unhead-solid] Transformed app.tsx')

      consoleSpy.mockRestore()
    })

    it('does not log when debug is false', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const code = `
        import { Suspense } from 'solid-js'
        import { useHead } from '@unhead/solid-js'
        export function App() {
          useHead({ title: 'Test' })
          return <Suspense><Child /></Suspense>
        }
      `
      plugin.transform!(code, 'app.tsx')

      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})
