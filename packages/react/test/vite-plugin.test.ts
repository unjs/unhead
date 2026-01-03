import { describe, expect, it } from 'vitest'
import { unheadReactPlugin } from '../src/stream/vite'

describe('unheadReactPlugin', () => {
  const plugin = unheadReactPlugin() as any

  describe('basic configuration', () => {
    it('has correct name', () => {
      expect(plugin.name).toBe('@unhead/react:streaming')
    })

    it('enforces pre order', () => {
      expect(plugin.enforce).toBe('pre')
    })
  })

  describe('transform', () => {
    it('skips non-jsx/tsx files', () => {
      const result = plugin.transform!('useHead({})', 'file.ts')
      expect(result).toBeNull()
    })

    it('skips files without Suspense', () => {
      const code = `
        export function App() {
          return <div>Hello</div>
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).toBeNull()
    })

    it('adds HeadStream to components with useHead', () => {
      const code = `
        import { useHead } from '@unhead/react'
        export function App() {
          useHead({ title: 'Test' })
          return (
            <div>Content</div>
          )
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('<HeadStream />')
    })

    it('adds HeadStream import from client for non-SSR builds', () => {
      const code = `
        import { useHead } from '@unhead/react'
        export function App() {
          useHead({ title: 'Test' })
          return <div>Content</div>
        }
      `
      const result = plugin.transform!(code, 'app.tsx', { ssr: false })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('import { HeadStream } from \'@unhead/react/stream/client\'')
    })

    it('adds HeadStream import from server for SSR builds', () => {
      const code = `
        import { useHead } from '@unhead/react'
        export function App() {
          useHead({ title: 'Test' })
          return <div>Content</div>
        }
      `
      const result = plugin.transform!(code, 'app.tsx', { ssr: true })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('import { HeadStream } from \'@unhead/react/stream/server\'')
    })

    it('adds HeadStream to existing server import for SSR builds', () => {
      const code = `
        import { useHead } from '@unhead/react'
        import { createStreamableHead } from '@unhead/react/stream/server'
        export function App() {
          useHead({ title: 'Test' })
          return <div>Content</div>
        }
      `
      const result = plugin.transform!(code, 'app.tsx', { ssr: true })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('createStreamableHead, HeadStream')
    })

    it('handles multiple components with useHead', () => {
      const code = `
        import { useHead } from '@unhead/react'
        function Component1() {
          useHead({ title: 'Page 1' })
          return <div>Page 1</div>
        }
        function Component2() {
          useHead({ title: 'Page 2' })
          return <div>Page 2</div>
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).not.toBeNull()
      expect(result!.code.match(/<HeadStream \/>/g)?.length).toBe(2)
    })

    it('handles arrow function components with useHead', () => {
      const code = `
        import { useHead } from '@unhead/react'
        const App = () => {
          useHead({ title: 'Arrow Component' })
          return <div>Content</div>
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('<HeadStream />')
    })

    it('skips non-Suspense JSX elements', () => {
      const code = `
        export function App() {
          return (
            <div>
              <span>Hello</span>
            </div>
          )
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).toBeNull()
    })

    it('generates source map', () => {
      const code = `
        import { useHead } from '@unhead/react'
        export function App() {
          useHead({ title: 'Test' })
          return <div>Content</div>
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).not.toBeNull()
      expect(result!.map).toBeDefined()
    })
  })
})
