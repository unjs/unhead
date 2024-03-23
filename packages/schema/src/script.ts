import type { ActiveHeadEntry, HeadEntryOptions } from './head'
import type { Script } from './schema'

export type UseScriptStatus = 'awaitingLoad' | 'loading' | 'loaded' | 'error' | 'removed'

/**
 * Either a string source for the script or full script properties.
 */
export type UseScriptInput = string | (Omit<Script, 'src'> & { src: string })
export type UseScriptResolvedInput = Omit<Script, 'src'> & { src: string }

export type ScriptInstance<T> = {
  id: string
  status: UseScriptStatus
  loadPromise: Promise<T>
  entry?: ActiveHeadEntry<any>
  load: () => Promise<T>
  remove: () => boolean
} & Promise<T>

export interface UseScriptOptions<T> extends HeadEntryOptions {
  /**
   * Resolve the script instance from the window.
   */
  use?: () => T | undefined | null
  /**
   * Stub the script instance. Useful for SSR or testing.
   */
  stub?: ((ctx: { script: ScriptInstance<T>, fn: string | symbol }) => any)
  /**
   * The trigger to load the script:
   * - `manual` - Load the script manually by calling `$script.load()`.
   * - `Promise` - Load the script when the promise resolves.
   */
  trigger?: 'manual' | Promise<void>
  /**
   * Context to run events with. This is useful in Vue to attach the current instance context before
   * calling the event, allowing the event to be reactive.
   */
  eventContext?: any
}
