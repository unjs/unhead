import type { LazyUnhead } from '../../../src/lazy'
import type { HeadEntryOptions } from '../../../src/types'
import type { Scenario } from './corpus'
import { JSDOM } from 'jsdom'
import { createHead as createV3Head } from '../../../src/client'
import { compileTags } from '../../../src/compiled/compile'
import { createLazyHead, lazyTemplateParams } from '../../../src/lazy'
import { TemplateParamsPlugin } from '../../../src/plugins'
import { createHead as createServerHead, renderSSRHead } from '../../../src/server'

export type Params = 'none' | 'plugin' | 'lazy'

export function toCompiledTags(input: any): any {
  const result = compileTags(input)
  return result._tag === 'Ok' ? result.tags : input
}

export function isCompiled(input: any): boolean {
  return compileTags(input)._tag === 'Ok'
}

export function ssrDom(inputs: { input: any, options?: HeadEntryOptions, dispose?: boolean, patch?: any }[], params: Params, serverOptions: Record<string, any> = {}) {
  const head = createServerHead({ disableDefaults: true, ...serverOptions, plugins: params === 'none' ? [] : [TemplateParamsPlugin] })
  for (const { input, options, dispose, patch } of inputs) {
    const entry = head.push(input, options)
    if (dispose)
      entry.dispose()
    if (patch !== undefined)
      entry.patch(patch)
  }
  const { headTags, htmlAttrs, bodyAttrs, bodyTags, bodyTagsOpen } = renderSSRHead(head)
  return new JSDOM(`<!DOCTYPE html><html${htmlAttrs}><head>${headTags}</head><body${bodyAttrs}>${bodyTagsOpen}<div>app</div>${bodyTags}</body></html>`)
}

export const tick = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Lets a debounced render and any lazy chunk it waits on finish. With a head, it also
 * waits up to a second for that head to render, because a first chunk import is slow under load.
 */
export async function settle(head?: { dirty: boolean }) {
  for (let i = 0; i < 4; i++)
    await tick()
  for (let i = 0; head?.dirty && i < 200; i++)
    await tick(5)
}

export interface Pair {
  v3: ReturnType<typeof createV3Head<any>>
  compiled: LazyUnhead<any>
  v3Dom: JSDOM
  compiledDom: JSDOM
  /** Renders both heads at the same point, as a framework does at the end of hydration or a navigation. */
  render: () => Promise<void>
  /** Pushes the same input to both heads: loose to v3, compiled tags to the lazy head when it compiles. */
  push: (input: any, options?: HeadEntryOptions) => { patch: (input: any) => void, dispose: () => void }
}

export function createPair(server: { input: any, options?: HeadEntryOptions, dispose?: boolean, patch?: any }[], params: Params, serverOptions?: Record<string, any>, compile = toCompiledTags): Pair {
  const v3Dom = ssrDom(server, params, serverOptions)
  const compiledDom = ssrDom(server, params, serverOptions)
  const v3 = createV3Head<any>({ document: v3Dom.window.document, plugins: params === 'none' ? [] : [TemplateParamsPlugin] })
  // batch, so both heads render at the same points
  v3._b = true
  const compiledTags = createLazyHead({
    document: compiledDom.window.document,
    plugins: params === 'none' ? [] : [params === 'lazy' ? lazyTemplateParams : TemplateParamsPlugin],
  })
  return {
    v3,
    compiled: compiledTags,
    v3Dom,
    compiledDom,
    async render() {
      v3.render()
      compiledTags.render()
      await compiledTags.load()
      await settle(compiledTags)
    },
    push(input, options) {
      const a = v3.push(input, options)
      const b = compiledTags.push(compile(input), options)
      return {
        patch(next) {
          a.patch(next)
          b.patch(compile(next))
        },
        dispose() {
          a.dispose()
          b.dispose()
        },
      }
    },
  }
}

export function applyScenario(pair: Pair, scenario: Scenario) {
  const entries = []
  for (const input of scenario.head?.init || []) {
    if (input)
      entries.push(pair.push(input as any))
  }
  for (const { input, options, dispose, patch } of scenario.entries) {
    const entry = pair.push(input, options)
    if (dispose)
      entry.dispose()
    if (patch !== undefined)
      entry.patch(patch)
    entries.push(entry)
  }
  return entries
}

export function serverEntries(scenario: Scenario) {
  return [...(scenario.head?.init || []).filter(Boolean).map(input => ({ input })), ...scenario.entries]
}
