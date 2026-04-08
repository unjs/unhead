import type { UnheadDevtoolsState } from './state'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { isConnected, syncState } from './state'

export const colorMode = ref<'dark' | 'light'>('dark')

export async function useDevtoolsConnection(): Promise<void> {
  if (typeof window === 'undefined')
    return

  console.log('[unhead devtools-app] useDevtoolsConnection: getting RPC client')
  const client = await getDevToolsRpcClient()
  console.log('[unhead devtools-app] RPC client obtained:', !!client)

  const sharedState = await (client.sharedState as any).get('unhead:state')
  console.log('[unhead devtools-app] sharedState handle obtained')

  const current = sharedState.value() as UnheadDevtoolsState | null
  console.log('[unhead devtools-app] initial value:', current ? `${current.tags.length} tags, ${current.entries.length} entries` : 'null')

  if (current) {
    isConnected.value = true
    syncState(current)
  }

  sharedState.on('updated', (newState: UnheadDevtoolsState) => {
    console.log('[unhead devtools-app] sharedState updated:', newState ? `${newState.tags.length} tags, ${newState.entries.length} entries` : 'null')
    if (newState) {
      isConnected.value = true
      syncState(newState)
    }
  })
}
