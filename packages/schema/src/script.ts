import type { ActiveHeadEntry, HeadEntryOptions } from './head'
import type { Script } from './schema'

export type UseScriptStatus = 'awaitingLoad' | 'loading' | 'loaded' | 'error' | 'removed'

/**
 * Either a string source for the script or full script properties.
 */
export type UseScriptInput = string | (Omit<Script, 'src'> & { src: string })
export type UseScriptResolvedInput = Omit<Script, 'src'> & { src: string }

export interface ScriptInstance<T> {
  id: string
  entry?: ActiveHeadEntry<any>
  loaded: boolean
  status: UseScriptStatus
  load: () => Promise<T>
  waitForLoad: () => Promise<T>
  remove: () => boolean
}

export interface UseScriptOptions<T> extends Omit<HeadEntryOptions, 'transform'> {
  /**
   * Should the `dns-prefetch` tag be skipped.
   *
   * Useful if loading the script through a local proxy.
   */
  skipEarlyConnections?: boolean
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
   * - `manual` - Load the script manually by calling `$script.load()` or `$script.waitForLoad()`.
   * - `Promise` - Load the script when the promise resolves.
   */
  trigger?: 'idle' | 'manual' | Promise<void>
}
