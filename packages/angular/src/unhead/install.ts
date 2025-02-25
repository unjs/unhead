import type { CreateClientHeadOptions, CreateServerHeadOptions, Unhead as UnheadSchema } from 'unhead/types'
import { InjectionToken, makeEnvironmentProviders } from '@angular/core'
import { BEFORE_APP_SERIALIZED } from '@angular/platform-server'
import { createHead as _createClientHead, createDebouncedFn, renderDOMHead } from 'unhead/client'
import { createHead as _createServerHead } from 'unhead/server'
import { Unhead } from '../lib/unhead.service'

export const headSymbol = 'usehead'

export const UnheadInjectionToken = new InjectionToken<UnheadSchema>(headSymbol)

export function provideServerHead(options: CreateServerHeadOptions = {}) {
  const head = _createServerHead(options)
  return makeEnvironmentProviders([
    { provide: UnheadInjectionToken, useValue: head },
    Unhead,
    {
      provide: BEFORE_APP_SERIALIZED,
      useFactory: (service: Unhead) => () => {
        return service._ssrModifyResponse()
      },
      deps: [Unhead],
      multi: true,
    },
  ])
}

export function provideClientHead(options: CreateClientHeadOptions = {}) {
  const head = _createClientHead({
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), fn => setTimeout(() => fn(), 0)),
    },
    ...options,
  })
  return makeEnvironmentProviders([
    { provide: UnheadInjectionToken, useValue: head },
  ])
}
