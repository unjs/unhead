import type { HookableCore } from 'hookable'
import type { ClientHeadHooks, CreateClientHeadOptions, HeadEntryOptions, HeadRenderer, HeadTag, ResolvableHead, Unhead } from '../types'
import { createUnhead, registerPlugin } from '../unhead'
import { TagPriorityAliases } from '../utils/const'
import { createHooks } from '../utils/hooks'
import { createDomRenderer } from './renderDOMHead'

const tagWeight = (tag: HeadTag) => typeof tag.tagPriority === 'number' ? tag.tagPriority : 100 + ((TagPriorityAliases as Record<string, number>)[tag.tagPriority as string] || 0)

export interface ClientUnhead<T = ResolvableHead, RenderResult = boolean> extends Unhead<T, RenderResult> {
  hooks: HookableCore<ClientHeadHooks<T, RenderResult>>
  dirty: boolean
  invalidate: () => void
}

type ClientHeadOptionsWithRenderer<Input, RenderResult> = Omit<CreateClientHeadOptions<Input, RenderResult>, 'render'> & {
  render: HeadRenderer<RenderResult, Input>
}

type HeadRendererContext<Input> = Omit<Unhead<Input, never>, 'hooks' | 'plugins' | 'render' | 'use'> & { render: () => unknown }
type InferableHeadRenderer<Input, RenderResult = unknown> = (head: HeadRendererContext<Input>) => RenderResult

export function createHead<Renderer extends InferableHeadRenderer<ResolvableHead> = InferableHeadRenderer<ResolvableHead>>(options: Omit<CreateClientHeadOptions<ResolvableHead, ReturnType<Renderer>>, 'render'> & { render: Renderer }): ClientUnhead<ResolvableHead, ReturnType<Renderer>>
export function createHead<T = ResolvableHead, Renderer extends InferableHeadRenderer<T> = InferableHeadRenderer<T>>(options: Omit<CreateClientHeadOptions<T, ReturnType<Renderer>>, 'render'> & { render: Renderer }): ClientUnhead<T, ReturnType<Renderer>>
export function createHead<T = ResolvableHead, RenderResult = unknown>(options: ClientHeadOptionsWithRenderer<T, RenderResult>): ClientUnhead<T, RenderResult>
export function createHead(options?: CreateClientHeadOptions<ResolvableHead, boolean>): ClientUnhead<ResolvableHead, boolean>
export function createHead<T = ResolvableHead>(options?: CreateClientHeadOptions<T, boolean>): ClientUnhead<T, boolean>
export function createHead(options: object = {}): unknown {
  const resolvedOptions = options as CreateClientHeadOptions<unknown, unknown>
  resolvedOptions.document = resolvedOptions.document || (typeof window !== 'undefined' ? document : undefined)
  const renderer = resolvedOptions.render || createDomRenderer({ document: resolvedOptions.document })
  const core = createUnhead<unknown, unknown>(renderer, { document: resolvedOptions.document, propResolvers: resolvedOptions.propResolvers, _tagWeight: tagWeight, init: [] })
  const hooks = createHooks<ClientHeadHooks<unknown, unknown>>(resolvedOptions.hooks)
  let dirty = false
  const head: ClientUnhead<unknown, unknown> = {
    ...core,
    ssr: false,
    hooks,
    use: p => registerPlugin(head, p),
    get dirty() { return dirty },
    set dirty(v) { dirty = v },
    render: () => renderer(head),
    invalidate() {
      for (const e of core.entries.values()) delete e._tags
      dirty = true
      hooks.callHook('entries:updated', head)
    },
    push(input: unknown, _options?: HeadEntryOptions<unknown>) {
      const onRendered = _options?.onRendered
      const unhook = onRendered
        ? hooks.hook('dom:rendered', onRendered as any)
        : undefined
      const active = core.push(input, _options)
      core.entries.get(active._i)!._o = input
      dirty = true
      hooks.callHook('entries:updated', head)
      return {
        _i: active._i,
        patch(input: unknown) {
          active.patch(input)
          dirty = true
          hooks.callHook('entries:updated', head)
        },
        dispose() {
          unhook?.()
          if (core.entries.has(active._i)) {
            active.dispose()
            head.invalidate()
          }
        },
      }
    },
  }
  hooks.hook('entries:updated', () => {
    renderer(head)
  })
  resolvedOptions.plugins?.forEach(p => registerPlugin(head, p))
  resolvedOptions.init?.forEach(e => e && head.push(e))
  return head
}
