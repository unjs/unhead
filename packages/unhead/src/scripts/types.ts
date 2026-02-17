import type {
  ActiveHeadEntry,
  DataKeys,
  HeadEntryOptions,
  HttpEventAttributes,
  MaybeEventFnHandlers,
  SchemaAugmentations,
  ScriptWithoutEvents,
} from '../types'

export type UseScriptStatus = 'awaitingLoad' | 'loading' | 'loaded' | 'error' | 'removed'

export type UseScriptContext<T extends Record<symbol | string, any>> = ScriptInstance<T>
/**
 * Either a string source for the script or full script properties.
 */
export type UseScriptResolvedInput = Omit<ScriptWithoutEvents, 'src'> & { src: string } & DataKeys & MaybeEventFnHandlers<HttpEventAttributes> & SchemaAugmentations['script']

type BaseScriptApi = Record<symbol | string, any>

type HasDiscriminatedParameters<T>
  = T extends {
    (first: infer A, ...rest1: any[]): any
    (first: infer B, ...rest2: any[]): any
  }
    ? A extends B
      ? B extends A
        ? false // Same first parameter type
        : true // Different first parameter types
      : true // Different first parameter types
    : false // Not a function with overloads

// Alternative: Check for different parameter count
type HasDifferentParameterCounts<T>
  = T extends { (...args: infer A): any } & { (...args: infer B): any }
    ? A['length'] extends B['length']
      ? B['length'] extends A['length']
        ? false // Same parameter count
        : true // Different parameter counts
      : true // Different parameter counts
    : false // Not a function with overloads

// Combined detection that works better for most cases
type IsOverloadedFunction<T>
  = HasDiscriminatedParameters<T> extends true
    ? true
    : HasDifferentParameterCounts<T> extends true
      ? true
      : false

export type AsVoidFunctions<T extends BaseScriptApi> = {
  [K in keyof T]: T[K] extends any[]
    ? T[K]
    : T[K] extends (...args: infer A) => any
      // we can't modify overloaded functions, so we need to check if the function is overloaded
      ? IsOverloadedFunction<T[K]> extends true ? T[K] : (...args: A) => void
      : T[K] extends Record<any, any>
        ? AsVoidFunctions<T[K]>
        : never;
}

export type UseScriptInput = string | UseScriptResolvedInput

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
  _triggerAbortControllers?: Set<AbortController>
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

export type RecordingEntry
  = | { type: 'get', key: string | symbol, args?: any[], value?: any }
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
