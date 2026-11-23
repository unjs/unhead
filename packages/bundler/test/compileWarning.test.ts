import { expect, it, vi } from 'vitest'
import { CompileTransform } from '../src/unplugin/CompileTransform'
import { createFrameworkPlugin } from '../src/unplugin/framework'
import { Unhead } from '../src/unplugin/vite'

// Each warning fires once per process, so each test owns one message.
const base = { devtools: false, validate: false, transformInlineScripts: false } as const
const streamingPlugin = { vite: () => [], webpack: () => [], rspack: () => [], rollup: () => [] } as any

function warnings(run: () => void): string[] {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  run()
  const messages = warn.mock.calls.map(call => String(call[0]))
  warn.mockRestore()
  return messages
}

it('stays quiet when a Vite build of @unhead/vue can compile, or when compile is off', () => {
  const UnheadVue = createFrameworkPlugin({ framework: '@unhead/vue', streamingPlugin })
  expect(warnings(() => {
    Unhead({ ...base, compile: true }, { framework: '@unhead/vue' })
    UnheadVue({ ...base, compile: true }).vite()
    UnheadVue(base).webpack()
    Unhead(base, { framework: '@unhead/react' })
  })).toEqual([])
})

it('warns once when the framework cannot compile', () => {
  const UnheadReact = createFrameworkPlugin({ framework: '@unhead/react', streamingPlugin })
  expect(warnings(() => {
    Unhead({ ...base, compile: true }, { framework: '@unhead/react' })
    UnheadReact({ ...base, compile: true }).vite()
  })).toEqual([expect.stringContaining('`compile` option needs `@unhead/vue`')])
})

it('warns once when the bundler cannot compile', () => {
  expect(warnings(() => {
    ;(CompileTransform as any).raw({}, { framework: 'webpack' })
    ;(CompileTransform as any).raw({}, { framework: 'webpack' })
  })).toEqual([expect.stringContaining('`compile` option needs a Vite build')])
})
