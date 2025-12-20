import type { CreateStreamableServerHeadOptions, Unhead } from 'unhead/types'
import { useContext } from 'solid-js'
import { ssr } from 'solid-js/web'
import { createStreamableHead as _createStreamableHead, renderSSRHeadSuspenseChunkSync } from 'unhead/stream/server'
import { UnheadContext } from '../context'

export { UnheadContext } from '../context'

export {
  renderSSRHeadClosing,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  streamWithHead,
} from 'unhead/stream/server'

const scriptTemplate = ['<script>', '</script>'] as TemplateStringsArray & string[]

/**
 * Streaming script component - outputs inline script with current head state.
 * The Vite plugin with streaming: true auto-injects this.
 */
export function HeadStreamScript() {
  const head = useContext(UnheadContext)
  if (!head)
    return null

  const update = renderSSRHeadSuspenseChunkSync(head)
  if (!update)
    return null

  return ssr(scriptTemplate, update)
}

export function createStreamableHead(options: CreateStreamableServerHeadOptions = {}): Unhead {
  return _createStreamableHead(options)
}

export type {
  CreateStreamableServerHeadOptions,
  Unhead,
} from 'unhead/types'
