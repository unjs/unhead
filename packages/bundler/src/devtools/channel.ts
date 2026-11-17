import type { UnheadDevtoolsState } from './rpc/types'

/**
 * In-page channel between the page script (`bridge.ts`, in the user app's page)
 * and the panel (the devtools iframe). Namespaced with the devframe id.
 */
export const UNHEAD_CHANNEL = 'unhead:devtools'

/**
 * The page script owns the head state; panels mirror it. No functions or events:
 * every change flows through the shared state.
 */
export interface UnheadChannelProtocol {
  sharedStates: {
    state: UnheadDevtoolsState
  }
}
