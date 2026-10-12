import type { EnvironmentProviders } from '@angular/core'
import type { CreateServerHeadOptions, UseHeadInput } from 'unhead/types'
import { makeEnvironmentProviders } from '@angular/core'
import { BEFORE_APP_SERIALIZED } from '@angular/platform-server'
import { UnheadInjectionToken } from '@unhead/angular'
import { createHead as _createServerHead } from 'unhead/server'
import { UnheadSSRService } from './ssr.service'

type ProvideServerHeadArgs<Input extends UseHeadInput> = UseHeadInput extends Input
  ? [options?: CreateServerHeadOptions<Input>]
  : [options: CreateServerHeadOptions<Input> & { disableDefaults: true }]

export function provideServerHead(options?: CreateServerHeadOptions<UseHeadInput>): EnvironmentProviders
export function provideServerHead<I extends UseHeadInput>(options: CreateServerHeadOptions<I> & { disableDefaults: true }): EnvironmentProviders
export function provideServerHead<I extends UseHeadInput>(options: CreateServerHeadOptions<I>): EnvironmentProviders
export function provideServerHead<I extends UseHeadInput = UseHeadInput>(...args: ProvideServerHeadArgs<I>): EnvironmentProviders
export function provideServerHead<I extends UseHeadInput = UseHeadInput>(options: CreateServerHeadOptions<I> = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: UnheadInjectionToken,
      useFactory: () => _createServerHead<I>(options as CreateServerHeadOptions<I> & { disableDefaults: true }),
    },
    UnheadSSRService,
    {
      provide: BEFORE_APP_SERIALIZED,
      useFactory: (service: UnheadSSRService) => () => {
        return service.render()
      },
      deps: [UnheadSSRService],
      multi: true,
    },
  ])
}
