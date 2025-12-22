import { useContext } from 'solid-js'
import { ssr } from 'solid-js/web'
import { renderSSRHeadSuspenseChunkSync } from 'unhead/stream/server'
import { UnheadContext } from '../context'

export { UnheadContext } from '../context'
export * from 'unhead/stream/server'

const scriptTemplate = ['<script>', '</script>'] as TemplateStringsArray & string[]

/**
 * Streaming script component - outputs inline script with current head state.
 * The Vite plugin with streaming: true auto-injects this.
 */
export function HeadStream() {
  const head = useContext(UnheadContext)
  if (!head)
    return null

  const update = renderSSRHeadSuspenseChunkSync(head)
  if (!update)
    return null

  return ssr(scriptTemplate, update)
}
