import { children, createRoot, useContext } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { UnheadContext as clientContext } from '../src/client'
import { UnheadContext } from '../src/context'
import { createHead, UnheadContext as serverContext } from '../src/server'

// Guards src/context.ts: the Solid context carrying the Unhead instance must
// default to null and hand the exact provided instance to nested consumers.
describe('unheadContext', () => {
  it('resolves to null when used outside a provider', () => {
    expect(createRoot(() => useContext(UnheadContext))).toBe(null)
  })

  it('provides the head instance to consumers within the provider tree', () => {
    const head = createHead({ disableDefaults: true })
    let resolved: unknown = 'unset'
    createRoot((dispose) => {
      children(() => UnheadContext({
        value: head,
        get children() {
          resolved = useContext(UnheadContext)
          return null
        },
      }))()
      dispose()
    })
    expect(resolved).toBe(head)
  })

  it('lets a nested provider shadow the outer head instance', () => {
    const outer = createHead({ disableDefaults: true })
    const inner = createHead({ disableDefaults: true })
    let resolvedOuter: unknown = 'unset'
    let resolvedInner: unknown = 'unset'
    createRoot((dispose) => {
      children(() => UnheadContext({
        value: outer,
        get children() {
          resolvedOuter = useContext(UnheadContext)
          return UnheadContext({
            value: inner,
            get children() {
              resolvedInner = useContext(UnheadContext)
              return null
            },
          })
        },
      }))()
      dispose()
    })
    expect(resolvedOuter).toBe(outer)
    expect(resolvedInner).toBe(inner)
  })

  it('re-exports the same context instance from the client and server entries', () => {
    expect(clientContext).toBe(UnheadContext)
    expect(serverContext).toBe(UnheadContext)
  })
})
