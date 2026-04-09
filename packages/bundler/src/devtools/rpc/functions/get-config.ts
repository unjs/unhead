import { defineRpcFunction } from '@vitejs/devtools-kit'

// Explicit `any` annotation breaks TS2883 portable-inference chain caused by
// transitive `@vitejs/devtools-rpc` types not being directly importable here.
export const getConfigRpc: any = defineRpcFunction({
  name: 'unhead:get-config',
  type: 'static',
  setup: ctx => ({
    handler: () => ({
      cwd: ctx.cwd,
      mode: ctx.mode,
    }),
  }),
})
