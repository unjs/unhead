import type { EnvironmentProviders } from '@angular/core'
import type { CreateClientHeadOptions, HeadRenderer, Unhead, UseHeadInput } from 'unhead/types'
import { DOCUMENT } from '@angular/common'
import { inject, makeEnvironmentProviders } from '@angular/core'
import { UnheadInjectionToken } from '@unhead/angular'
import { createHead as _createClientHead, createDebouncedFn, createDomRenderer } from 'unhead/client'

type ClientHeadOptionsWithRenderer<Input, RenderResult> = Omit<CreateClientHeadOptions<Input, RenderResult>, 'render'> & {
  render: HeadRenderer<RenderResult, Input>
}

type DefaultClientHeadOptions<Input> = Omit<CreateClientHeadOptions<Input, void>, 'render'> & {
  render?: undefined
}

export function provideClientHead<Input extends UseHeadInput, RenderResult>(options: ClientHeadOptionsWithRenderer<Input, RenderResult>): EnvironmentProviders
export function provideClientHead<Input extends UseHeadInput = UseHeadInput>(options?: DefaultClientHeadOptions<Input>): EnvironmentProviders
export function provideClientHead(options: object = {}): EnvironmentProviders {
  const resolvedOptions = options as CreateClientHeadOptions<UseHeadInput, unknown>
  return makeEnvironmentProviders([{
    provide: UnheadInjectionToken,
    useFactory: () => {
      const document = inject(DOCUMENT)
      if (resolvedOptions.render) {
        return _createClientHead<UseHeadInput, unknown>({
          document,
          ...resolvedOptions,
          render: resolvedOptions.render,
        })
      }

      const domRenderer = createDomRenderer({ document })
      let head: Unhead<UseHeadInput, void>
      const debouncedRenderer = createDebouncedFn(() => {
        domRenderer(head)
      }, fn => setTimeout(fn, 0))
      const { render: _, ...rest } = resolvedOptions
      head = _createClientHead<UseHeadInput, void>({
        document,
        ...(rest as Omit<CreateClientHeadOptions<UseHeadInput, void>, 'render'>),
        render: debouncedRenderer,
      })
      return head
    },
  }])
}
