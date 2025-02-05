import type { ActiveHeadEntry, DataKeys, HeadEntryOptions, SchemaAugmentations, Script, ScriptBase } from '@unhead/schema'

export type UseScriptStatus = 'awaitingLoad' | 'loading' | 'loaded' | 'error' | 'removed'

export type UseScriptContext<T extends Record<symbol | string, any>> = ScriptInstance<T>
/**
 * Either a string source for the script or full script properties.
 */
export type UseScriptResolvedInput = Omit<Script, 'src'> & { src: string }
type BaseScriptApi = Record<symbol | string, any>

export type AsVoidFunctions<T extends BaseScriptApi> = {
  [key in keyof T]:
  T[key] extends any[] ? T[key] :
    T[key] extends (...args: infer A) => any ? (...args: A) => void :
      T[key] extends Record<any, any> ? AsVoidFunctions<T[key]> :
        never
}

export type UseScriptInput = string | (Omit<ScriptBase & DataKeys & SchemaAugmentations['script'], 'src'> & { src: string })

export type UseFunctionType<T, U> = T extends {
  use: infer V
} ? V extends (...args: any) => any ? ReturnType<V> : U : U

export type WarmupStrategy = false | 'preload' | 'preconnect' | 'dns-prefetch'

export interface ScriptInstance<T extends BaseScriptApi> {
  proxy: AsVoidFunctions<T>
  instance?: T
  id: string
  status: Readonly<UseScriptStatus>
  entry?: ActiveHeadEntry<any>
  load: () => Promise<T>
  warmup: (rel: WarmupStrategy) => ActiveHeadEntry<any>
  remove: () => boolean
  setupTriggerHandler: (trigger: UseScriptOptions['trigger']) => void
  // cbs
  onLoaded: (fn: (instance: T) => void | Promise<void>, options?: EventHandlerOptions) => void
  onError: (fn: (err?: Error) => void | Promise<void>, options?: EventHandlerOptions) => void
  /**
   * @internal
   */
  _loadPromise: Promise<T | false>
  /**
   * @internal
   */
  _warmupEl: any
  /**
   * @internal
   */
  _triggerAbortController?: AbortController | null
  /**
   * @internal
   */
  _triggerAbortPromise?: Promise<void>
  /**
   * @internal
   */
  _triggerPromises?: Promise<void>[]
  /**
   * @internal
   */
  _cbs: {
    loaded: null | ((instance: T) => void | Promise<void>)[]
    error: null | ((err?: Error) => void | Promise<void>)[]
  }
}

export interface EventHandlerOptions {
  /**
   * Used to dedupe the event, allowing you to have an event run only a single time.
   */
  key?: string
}

export type RecordingEntry =
  | { type: 'get', key: string | symbol, args?: any[], value?: any }
  | { type: 'apply', key: string | symbol, args: any[] }

export interface UseScriptOptions<T extends BaseScriptApi = Record<string, any>> extends HeadEntryOptions {
  /**
   * Resolve the script instance from the window.
   */
  use?: () => T | undefined | null
  /**
   * The trigger to load the script:
   * - `undefined` | `client` - (Default) Load the script on the client when this js is loaded.
   * - `manual` - Load the script manually by calling `$script.load()`, exists only on the client.
   * - `Promise` - Load the script when the promise resolves, exists only on the client.
   * - `Function` - Register a callback function to load the script, exists only on the client.
   * - `server` - Have the script injected on the server.
   */
  trigger?: 'client' | 'server' | 'manual' | Promise<boolean | void> | ((fn: any) => any) | null
  /**
   * Add a preload or preconnect link tag before the script is loaded.
   */
  warmupStrategy?: WarmupStrategy
  /**
   * Context to run events with. This is useful in Vue to attach the current instance context before
   * calling the event, allowing the event to be reactive.
   */
  eventContext?: any
  /**
   * Called before the script is initialized. Will not be triggered when the script is already loaded. This means
   * this is guaranteed to be called only once, unless the script is removed and re-added.
   */
  beforeInit?: () => void
}

export type UseScriptReturn<T extends Record<symbol | string, any>> = UseScriptContext<UseFunctionType<UseScriptOptions<T>, T>>
