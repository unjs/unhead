import { describe, expect, it } from 'vitest'
import { unheadSolidPlugin } from '../src/stream/vite'

describe('unheadSolidPlugin', () => {
  const plugin = unheadSolidPlugin() as any

  describe('basic configuration', () => {
    it('has correct name', () => {
      expect(plugin.name).toBe('@unhead/solid-js:streaming')
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

    it('skips files without useHead', () => {
      const code = `
        export function App() {
          return <div>Hello</div>
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).toBeNull()
    })

    it('wraps JSX return with HeadStream fragment', () => {
      const code = `
        import { useHead } from '@unhead/solid-js'
        export function App() {
          useHead({ title: 'Test' })
          return <div>Hello</div>
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('<><HeadStream />')
      expect(result!.code).toContain('</>')
    })

    it('adds HeadStream import from client for non-SSR builds', () => {
      const code = `
        import { useHead } from '@unhead/solid-js'
        export function App() {
          useHead({ title: 'Test' })
          return <div>Hello</div>
        }
      `
      const result = plugin.transform!(code, 'app.tsx', { ssr: false })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('import { HeadStream } from \'@unhead/solid-js/stream/client\'')
    })

    it('adds HeadStream import from server for SSR builds', () => {
      const code = `
        import { useHead } from '@unhead/solid-js'
        export function App() {
          useHead({ title: 'Test' })
          return <div>Hello</div>
        }
      `
      const result = plugin.transform!(code, 'app.tsx', { ssr: true })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('import { HeadStream } from \'@unhead/solid-js/stream/server\'')
    })

    it('adds HeadStream to existing server import for SSR builds', () => {
      const code = `
        import { useHead } from '@unhead/solid-js'
        import { createStreamableHead } from '@unhead/solid-js/stream/server'
        export function App() {
          useHead({ title: 'Test' })
          return <div>Hello</div>
        }
      `
      const result = plugin.transform!(code, 'app.tsx', { ssr: true })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('createStreamableHead, HeadStream')
    })

    it('transforms files with useSeoMeta', () => {
      const code = `
        import { useSeoMeta } from '@unhead/solid-js'
        export function App() {
          useSeoMeta({ title: 'Test' })
          return <div>Hello</div>
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('<><HeadStream />')
    })

    it('handles arrow function with implicit return', () => {
      const code = `
        import { useHead } from '@unhead/solid-js'
        const App = () => {
          useHead({ title: 'Test' })
          return <div>Hello</div>
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('<><HeadStream />')
    })

    it('handles parenthesized JSX return', () => {
      const code = `
        import { useHead } from '@unhead/solid-js'
        export function App() {
          useHead({ title: 'Test' })
          return (
            <div>Hello</div>
          )
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('<><HeadStream />')
    })

    it('generates source map', () => {
      const code = `
        import { useHead } from '@unhead/solid-js'
        export function App() {
          useHead({ title: 'Test' })
          return <div>Hello</div>
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).not.toBeNull()
      expect(result!.map).toBeDefined()
    })
  })
})
