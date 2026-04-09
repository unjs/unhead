import type { UnheadDevtoolsState } from './state'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { isConnected, syncState } from './state'

export const colorMode = ref<'dark' | 'light'>('dark')

export async function useDevtoolsConnection(): Promise<void> {
  if (typeof window === 'undefined')
    return

  await getDevToolsRpcClient()
    .then(async (client) => {
      const sharedState = await client.sharedState.get('unhead:state')
      if (!sharedState)
        return

      const current = sharedState.value() as UnheadDevtoolsState | null
      if (current) {
        isConnected.value = true
        syncState(current)
      }

      sharedState.on('updated', (newState: UnheadDevtoolsState) => {
        if (newState) {
          isConnected.value = true
          syncState(newState)
        }
      })
    })
    .catch((err) => {
      console.warn('[unhead] Failed to connect to devtools:', err)
    })
}
