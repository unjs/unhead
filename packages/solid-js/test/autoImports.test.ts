import * as unheadPlugins from 'unhead/plugins'
import * as unheadUtils from 'unhead/utils'
import { describe, expect, it } from 'vitest'
import { hookImports } from '../src/autoImports'
import * as packageEntry from '../src/index'
import * as pluginsFacade from '../src/plugins'
import * as utilsFacade from '../src/utils'

// Guards src/autoImports.ts: the table drives auto-imports for `@unhead/solid`
// and must never drift from what the package entry actually exports.
describe('hookImports', () => {
  it('targets the @unhead/solid module only', () => {
    expect(Object.keys(hookImports)).toEqual(['@unhead/solid'])
  })

  it('lists the composable names auto-imports should register', () => {
    expect(hookImports['@unhead/solid']).toEqual([
      'useUnhead',
      'useHead',
      'useSeoMeta',
      'useHeadSafe',
    ])
  })

  it('only lists names the package entry actually exports', () => {
    for (const name of hookImports['@unhead/solid']) {
      expect((packageEntry as Record<string, unknown>)[name]).toBeTypeOf('function')
    }
  })
})

// Guards the src/utils.ts and src/plugins.ts facades: both are pure
// `export * from` pass-throughs and must not hide or replace any export.
describe('re-export facades', () => {
  it('utils re-exports the full unhead/utils surface unchanged', () => {
    expect(Object.keys(utilsFacade).sort()).toEqual(Object.keys(unheadUtils).sort())
    for (const key of Object.keys(unheadUtils)) {
      expect((utilsFacade as Record<string, unknown>)[key]).toBe((unheadUtils as Record<string, unknown>)[key])
    }
  })

  it('plugins re-exports the full unhead/plugins surface unchanged', () => {
    expect(Object.keys(pluginsFacade).sort()).toEqual(Object.keys(unheadPlugins).sort())
    for (const key of Object.keys(unheadPlugins)) {
      expect((pluginsFacade as Record<string, unknown>)[key]).toBe((unheadPlugins as Record<string, unknown>)[key])
    }
  })
})
