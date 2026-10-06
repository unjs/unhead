import type { UnheadDevtoolsConfig } from '../types'
import { defineRpcFunction } from '@vitejs/devtools-kit'

// Explicit `any` annotation breaks TS2883 portable-inference chain caused by
// transitive `devframe/rpc` types not being directly importable here.
export function createGetConfigRpc(version: () => string): any {
  return defineRpcFunction({
    name: 'get-config',
    type: 'static',
    jsonSerializable: true,
    setup: ctx => ({
      handler: (): UnheadDevtoolsConfig => ({
        cwd: ctx.cwd,
        mode: ctx.mode,
        version: version(),
      }),
    }),
  })
}
