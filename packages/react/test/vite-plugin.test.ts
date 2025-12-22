import { describe, expect, it } from 'vitest'
import { unheadReactPlugin } from '../src/stream/vite'

describe('unheadReactPlugin', () => {
  const plugin = unheadReactPlugin() as any

  describe('basic configuration', () => {
    it('has correct name', () => {
      expect(plugin.name).toBe('unhead:react')
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

    it('adds HeadStream inside Suspense boundaries', () => {
      const code = `
        import { Suspense } from 'react'
        export function App() {
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <AsyncComponent />
            </Suspense>
          )
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).not.toBeNull()
      expect(result!.code).toContain('<HeadStream />')
    })

    it('adds HeadStream import from client for non-SSR builds', () => {
      const code = `
        import { Suspense } from 'react'
        export function App() {
          return <Suspense fallback={<div>Loading...</div>}>
            <AsyncComponent />
          </Suspense>
        }
      `
      const result = plugin.transform!(code, 'app.tsx', { ssr: false })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('import { HeadStream } from \'@unhead/react/stream/client\'')
    })

    it('adds HeadStream import from server for SSR builds', () => {
      const code = `
        import { Suspense } from 'react'
        export function App() {
          return <Suspense fallback={<div>Loading...</div>}>
            <AsyncComponent />
          </Suspense>
        }
      `
      const result = plugin.transform!(code, 'app.tsx', { ssr: true })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('import { HeadStream } from \'@unhead/react/stream/server\'')
    })

    it('adds HeadStream to existing server import for SSR builds', () => {
      const code = `
        import { Suspense } from 'react'
        import { createStreamableHead } from '@unhead/react/stream/server'
        export function App() {
          return <Suspense fallback={<div>Loading...</div>}>
            <AsyncComponent />
          </Suspense>
        }
      `
      const result = plugin.transform!(code, 'app.tsx', { ssr: true })
      expect(result).not.toBeNull()
      expect(result!.code).toContain('createStreamableHead, HeadStream')
    })

    it('handles multiple Suspense boundaries', () => {
      const code = `
        import { Suspense } from 'react'
        export function App() {
          return (
            <div>
              <Suspense fallback={<div>Loading 1...</div>}>
                <Component1 />
              </Suspense>
              <Suspense fallback={<div>Loading 2...</div>}>
                <Component2 />
              </Suspense>
            </div>
          )
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).not.toBeNull()
      expect(result!.code.match(/<HeadStream \/>/g)?.length).toBe(2)
    })

    it('handles nested Suspense boundaries', () => {
      const code = `
        import { Suspense } from 'react'
        const App = () => (
          <Suspense fallback={<div>Loading outer...</div>}>
            <div>
              <Suspense fallback={<div>Loading inner...</div>}>
                <AsyncComponent />
              </Suspense>
            </div>
          </Suspense>
        )
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
        import { Suspense } from 'react'
        export function App() {
          return <Suspense fallback={<div>Loading...</div>}>
            <AsyncComponent />
          </Suspense>
        }
      `
      const result = plugin.transform!(code, 'app.tsx')
      expect(result).not.toBeNull()
      expect(result!.map).toBeDefined()
    })
  })
})
