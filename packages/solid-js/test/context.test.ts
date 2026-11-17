import { createRoot, useContext } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { UnheadContext as clientContext } from '../src/client'
import { UnheadContext } from '../src/context'
import { createHead, UnheadContext as serverContext } from '../src/server'

// Guards src/context.ts: the Solid context carrying the Unhead instance must
// default to null and hand the exact provided instance to nested consumers.
describe('unheadContext', () => {
  it('resolves to null when used outside a provider', () => {
    expect(useContext(UnheadContext)).toBe(null)
  })

  it('provides the head instance to consumers within the provider tree', () => {
    const head = createHead({ disableDefaults: true })
    let resolved: unknown = 'unset'
    createRoot(() => {
      UnheadContext.Provider({
        value: head,
        // function children are supported at runtime, the JSX.Element type
        // just cannot express them for a non-JSX call site
        children: (() => {
          resolved = useContext(UnheadContext)
        }) as unknown as Element,
      })
    })
    expect(resolved).toBe(head)
  })

  it('lets a nested provider shadow the outer head instance', () => {
    const outer = createHead({ disableDefaults: true })
    const inner = createHead({ disableDefaults: true })
    let resolvedOuter: unknown = 'unset'
    let resolvedInner: unknown = 'unset'
    createRoot(() => {
      UnheadContext.Provider({
        value: outer,
        children: (() => {
          resolvedOuter = useContext(UnheadContext)
          UnheadContext.Provider({
            value: inner,
            children: (() => {
              resolvedInner = useContext(UnheadContext)
            }) as unknown as Element,
          })
        }) as unknown as Element,
      })
    })
    expect(resolvedOuter).toBe(outer)
    expect(resolvedInner).toBe(inner)
  })

  it('re-exports the same context instance from the client and server entries', () => {
    expect(clientContext).toBe(UnheadContext)
    expect(serverContext).toBe(UnheadContext)
  })
})
