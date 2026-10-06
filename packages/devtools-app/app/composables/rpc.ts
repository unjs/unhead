import type { DevframeRpcClient } from 'devframe/client'
import type { UnheadDevtoolsConfig, UnheadDevtoolsState } from './state'
import { connectDevframe } from 'devframe/client'
import { connectPanelChannel } from 'devframe/in-page-channel'
import { connectionStatus, syncState, unheadVersion } from './state'

export const colorMode = ref<'dark' | 'light'>('dark')

// How long to wait for the page script before telling the user how to load it.
const PAGE_SCRIPT_GRACE_MS = 3000

// Mirrors packages/bundler/src/devtools/channel.ts (the page script's side).
const UNHEAD_CHANNEL = 'unhead:devtools'
interface UnheadChannelProtocol {
  sharedStates: {
    state: UnheadDevtoolsState
  }
}

let client: Promise<DevframeRpcClient> | undefined

export async function useDevtoolsConnection(): Promise<void> {
  if (typeof window === 'undefined')
    return

  // The devframe serves `__connection.json` at the panel's mount base.
  client ??= connectDevframe({ baseURL: useRuntimeConfig().app.baseURL })
  callRpc<UnheadDevtoolsConfig>('unhead:get-config')
    .then((config) => {
      unheadVersion.value = config.version
    })
    .catch((err) => {
      console.warn('[unhead] Failed to load devtools config:', err)
    })

  // Head state comes straight from the page script in the host page, not the server.
  const channel = connectPanelChannel<UnheadChannelProtocol>({ name: UNHEAD_CHANNEL, functions: {} })
  channel.events.on('status:updated', (status) => {
    if (status === 'connected')
      connectionStatus.value = 'connected'
    // A host page reload drops the port; the channel re-handshakes on its own.
    else if (connectionStatus.value === 'connected')
      connectionStatus.value = 'connecting'
  })
  channel.whenConnected(PAGE_SCRIPT_GRACE_MS).catch(() => {
    if (connectionStatus.value !== 'connected')
      connectionStatus.value = 'waiting'
  })
  const sharedState = await channel.sharedState.get('state')
  connectionStatus.value = 'connected'
  syncState(sharedState.value() as UnheadDevtoolsState)
  sharedState.on('updated', (newState) => {
    syncState(newState as UnheadDevtoolsState)
  })
}

export async function callRpc<T = any>(name: string, ...args: any[]): Promise<T> {
  if (!client)
    throw new Error('[unhead] DevTools RPC client unavailable')
  const rpc = await client
  return await (rpc.call as (name: string, ...args: any[]) => Promise<T>)(name, ...args)
}
