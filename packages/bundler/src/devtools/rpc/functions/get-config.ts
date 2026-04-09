import { defineRpcFunction } from '@vitejs/devtools-kit'

export const getConfigRpc = defineRpcFunction({
  name: 'unhead:get-config',
  type: 'static',
  setup: ctx => ({
    handler: () => ({
      cwd: ctx.cwd,
      mode: ctx.mode,
    }),
  }),
})
