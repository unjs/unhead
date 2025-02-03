import type { CreateHeadOptions } from '@unhead/schema'
import type { AngularUnhead } from './types/index'
import { InjectionToken, makeEnvironmentProviders } from '@angular/core'
import { BEFORE_APP_SERIALIZED } from '@angular/platform-server'
import { createHead as _createClientHead } from 'unhead/client'
import { createHead as _createServerHead } from 'unhead/server'
import { createDebouncedFn, renderDOMHead } from 'unhead/src/client'
import { Unhead } from '../lib/unhead.service'
import { ReactivityPlugin } from '../unhead/ReactivityPlugin'

export const headSymbol = 'usehead'

export const UnheadInjectionToken = new InjectionToken<AngularUnhead>(headSymbol)

export function provideServerHead(options: Omit<CreateHeadOptions, 'domDelayFn' | 'document'> = {}) {
  const head = _createServerHead<AngularUnhead>({
    ...options,
    plugins: [
      ...(options.plugins || []),
      ReactivityPlugin,
    ],
  })
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

export function provideClientHead(options: Omit<CreateHeadOptions, 'domOptions' | 'document'> = {}) {
  const head = _createClientHead<AngularUnhead>({
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), fn => setTimeout(() => fn(), 0)),
    },
    ...options,
    plugins: [
      ...(options.plugins || []),
      ReactivityPlugin,
    ],
  })
  return makeEnvironmentProviders([
    { provide: UnheadInjectionToken, useValue: head },
  ])
}
