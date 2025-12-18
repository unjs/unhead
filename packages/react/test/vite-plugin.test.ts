import { describe, expect, it, vi } from 'vitest'
import { unheadReactPlugin } from '../src/vite-plugin'

describe('unheadReactPlugin', () => {
  const plugin = unheadReactPlugin()
  // Default transform (client mode, ssr: false)
  const transform = (code: string, id: string) => {
    const result = plugin.transform?.(code, id, { ssr: false })
    return result?.code ?? code
  }
  // SSR transform
  const transformSSR = (code: string, id: string) => {
    const result = plugin.transform?.(code, id, { ssr: true })
    return result?.code ?? code
  }

  describe('basic transformation', () => {
    it('injects HeadStream into Suspense in tsx files with useHead', () => {
      const input = `
import { Suspense } from 'react'
import { useHead } from '@unhead/react'

function Page() {
  useHead({ title: 'Test' })
  return <Suspense fallback={<div>Loading</div>}><Content /></Suspense>
}
`
      const result = transform(input, 'page.tsx')

      // Should inject HeadStream before closing tag
      expect(result).toContain('<HeadStream /></Suspense>')
      expect(result).toContain('@unhead/react')
      // Original Suspense should be preserved
      expect(result).toContain('<Suspense fallback')
    })

    it('handles self-closing Suspense', () => {
      const input = `
import { Suspense } from 'react'
import { useHead } from '@unhead/react'

function Page() {
  useHead({ title: 'Test' })
  return <Suspense fallback={<div/>} />
}
`
      const result = transform(input, 'page.tsx')

      // Should convert to non-self-closing with HeadStream and proper closing tag
      expect(result).toContain('<HeadStream /></Suspense>')
      // Should have proper Suspense closing tag
      expect(result).toContain('</Suspense>')
      // Original self-closing pattern should be gone
      expect(result).not.toContain('} />')
    })

    it('handles closing tags', () => {
      const input = `
import { Suspense } from 'react'
import { useHead } from '@unhead/react'

function Page() {
  useHead({ title: 'Test' })
  return (
    <Suspense fallback={<div>Loading</div>}>
      <Content />
    </Suspense>
  )
}
`
      const result = transform(input, 'page.tsx')

      // HeadStream should be before closing tag
      expect(result).toContain('<HeadStream /></Suspense>')
      // Suspense is preserved
      expect(result).toContain('<Suspense fallback')
    })
  })

  describe('import handling', () => {
    it('adds HeadStream to existing @unhead/react import', () => {
      const input = `
import { Suspense } from 'react'
import { useHead } from '@unhead/react'

function Page() {
  useHead({ title: 'Test' })
  return <Suspense fallback={<div>Loading</div>}><Content /></Suspense>
}
`
      const result = transform(input, 'page.tsx')

      // Should add HeadStream to existing import
      expect(result).toContain('HeadStream')
      expect(result).toMatch(/@unhead\/react/)
    })

    it('adds new import from client for non-SSR builds', () => {
      const input = `
import { Suspense } from 'react'

// useHead is used indirectly
const useHead = () => {}

function Page() {
  useHead({ title: 'Test' })
  return <Suspense fallback={<div>Loading</div>}><Content /></Suspense>
}
`
      const result = transform(input, 'page.tsx')

      expect(result).toContain('import { HeadStream } from \'@unhead/react/client\'')
    })

    it('adds new import from server for SSR builds', () => {
      const input = `
import { Suspense } from 'react'

// useHead is used indirectly
const useHead = () => {}

function Page() {
  useHead({ title: 'Test' })
  return <Suspense fallback={<div>Loading</div>}><Content /></Suspense>
}
`
      const result = transformSSR(input, 'page.tsx')

      expect(result).toContain('import { HeadStream } from \'@unhead/react/server\'')
    })
  })

  describe('filtering', () => {
    it('skips non-jsx files', () => {
      const input = `const Suspense = 'test'`
      const result = transform(input, 'file.ts')

      expect(result).toBe(input)
    })

    it('skips files without Suspense', () => {
      const input = `
import { useHead } from '@unhead/react'
function Page() { return <div /> }
`
      const result = transform(input, 'page.tsx')

      expect(result).toBe(input)
    })

    it('skips files without useHead when onlyWithUseHead is true', () => {
      const input = `
import { Suspense } from 'react'
function Page() { return <Suspense><Content /></Suspense> }
`
      const result = transform(input, 'page.tsx')

      expect(result).toBe(input)
    })

    it('transforms all Suspense when onlyWithUseHead is false', () => {
      const pluginAll = unheadReactPlugin({ onlyWithUseHead: false })
      const transformAll = (code: string, id: string) => {
        const result = pluginAll.transform?.(code, id)
        return result?.code ?? code
      }

      const input = `
import { Suspense } from 'react'
function Page() { return <Suspense><Content /></Suspense> }
`
      const result = transformAll(input, 'page.tsx')

      expect(result).toContain('<HeadStream />')
    })

    it('skips files already using HeadStream', () => {
      const input = `
import { HeadStream } from '@unhead/react/server'
import { useHead } from '@unhead/react'

function Page() {
  useHead({ title: 'Test' })
  return <Suspense><Content /><HeadStream /></Suspense>
}
`
      const result = transform(input, 'page.tsx')

      expect(result).toBe(input)
    })
  })

  describe('multiple Suspense', () => {
    it('transforms all Suspense instances', () => {
      const input = `
import { Suspense } from 'react'
import { useHead } from '@unhead/react'

function Page() {
  useHead({ title: 'Test' })
  return (
    <>
      <Suspense fallback={<div>1</div>}><A /></Suspense>
      <Suspense fallback={<div>2</div>}><B /></Suspense>
    </>
  )
}
`
      const result = transform(input, 'page.tsx')

      // Both should have HeadStream injected
      const headStreamCount = (result.match(/<HeadStream \/>/g) || []).length
      expect(headStreamCount).toBe(2)
      // Suspense preserved
      expect(result).toContain('<Suspense fallback')
    })
  })

  describe('edge cases', () => {
    it('preserves Suspense in strings', () => {
      const input = `
import { Suspense } from 'react'
import { useHead } from '@unhead/react'

function Page() {
  useHead({ title: 'Test' })
  const text = "<Suspense>not real</Suspense>"
  return <Suspense><Content /></Suspense>
}
`
      const result = transform(input, 'page.tsx')

      // Real JSX should be transformed
      expect(result).toContain('<HeadStream /></Suspense>')
      // String should be preserved
      expect(result).toContain('"<Suspense>not real</Suspense>"')
    })
  })

  describe('debug option', () => {
    it('logs to console when debug is true', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const debugPlugin = unheadReactPlugin({ debug: true })

      const input = `
import { Suspense } from 'react'
import { useHead } from '@unhead/react'

function Page() {
  useHead({ title: 'Test' })
  return <Suspense><Content /></Suspense>
}
`
      debugPlugin.transform!(input, 'page.tsx')

      expect(consoleSpy).toHaveBeenCalledWith('[unhead-react] Transformed page.tsx')

      consoleSpy.mockRestore()
    })

    it('does not log when debug is false', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const input = `
import { Suspense } from 'react'
import { useHead } from '@unhead/react'

function Page() {
  useHead({ title: 'Test' })
  return <Suspense><Content /></Suspense>
}
`
      transform(input, 'page.tsx')

      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})
