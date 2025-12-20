import type { CreateStreamableServerHeadOptions, Unhead } from 'unhead/types'
import { createStreamableHead as _createStreamableHead } from 'unhead/stream/server'

export { UnheadContext } from '../context'

export {
  renderSSRHeadClosing,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  streamWithHead,
} from 'unhead/stream/server'

export function createStreamableHead(options: CreateStreamableServerHeadOptions = {}): Unhead {
  return _createStreamableHead(options)
}

export type {
  CreateStreamableServerHeadOptions,
  Unhead,
} from 'unhead/types'
