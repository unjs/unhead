import type {
  ActiveHeadEntry,
  DataKeys,
  GenericScript,
  HeadEntryOptions,
  HttpEventAttributes,
  MaybeEventFnHandlers,
  SchemaAugmentations,
  ScriptHttpEvents,
} from '../types'

export type UseScriptStatus = 'awaitingLoad' | 'loading' | 'loaded' | 'error' | 'removed'

export type UseScriptContext<T extends Record<symbol | string, any>> = ScriptInstance<T>
/**
 * Either a string source for the script or full script properties.
 */
type UseScriptInputBase = Omit<GenericScript, 'src' | keyof ScriptHttpEvents> & DataKeys & MaybeEventFnHandlers<HttpEventAttributes> & SchemaAugmentations['script']

export type UseScriptResolvedInput = UseScriptInputBase & { src: string }

/** A logical client-side script resource without a DOM script tag. */
export interface UseScriptSourceLessInput {
  key: string
  src?: never
  innerHTML?: never
  onerror?: never
  onload?: never
  textContent?: never
}

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
  resolve: infer V
} ? V extends (...args: any) => any ? NonNullable<Awaited<ReturnType<V>>> : U : T extends {
    use: infer V
  } ? V extends (...args: any) => any ? NonNullable<Awaited<ReturnType<V>>> : U : U

export type WarmupStrategy = false | 'preload' | 'preconnect' | 'dns-prefetch'

export type UseScriptWaitForSetup<T> = (
  resolve: (value: T | PromiseLike<T>) => void,
  reject: (reason?: unknown) => void,
) => void | (() => void)

export interface UseScriptWaitForResolve<T = unknown> {
  <V extends T>(value: V): V
  <V extends T>(value: PromiseLike<V>): PromiseLike<V>
}

type UseScriptWaitForInferredResult<T> = [T] extends [void | (() => void)]
  ? unknown
  : NonNullable<Awaited<T>>

export interface UseScriptWaitFor {
  /**
   * With an explicit result type, setup may use callback-style registration and
   * return cleanup. Without one, `waitFor(resolve => resolve(value))` infers it.
   */
  <T = never, R = void>(setup: (
    resolve: UseScriptWaitForResolve<[T] extends [never] ? unknown : T>,
    reject: (reason?: unknown) => void,
  ) => R): Promise<[T] extends [never] ? UseScriptWaitForInferredResult<R> : T>
}

export interface UseScriptContextOptions {
  /**
   * Aborted when the script is removed or fails to load.
   */
  signal: AbortSignal
  /**
   * Wait for an SDK-specific readiness callback. Abort rejection and returned
   * cleanup are tied to the script lifecycle.
   */
  waitFor: UseScriptWaitFor
}

export type UseScriptResolver<T extends BaseScriptApi>
  = (ctx: UseScriptContextOptions) => T | PromiseLike<T | undefined | null> | undefined | null

/**
 * Register a script load trigger. A returned function is treated as cleanup;
 * other return values are ignored for backwards compatibility.
 */
export type UseScriptTrigger = (load: () => void) => any

export type UseScriptLoader<T extends BaseScriptApi = BaseScriptApi> = (ctx: UseScriptContextOptions) => T | PromiseLike<T>

/**
 * A consumer-owned view of a shared script. Disposing it only releases the
 * callbacks and triggers registered through this scope.
 */
export interface ScriptScope<T extends BaseScriptApi> extends ScriptInstance<T> {
  readonly script: ScriptInstance<T>
  /**
   * Aborted when this consumer is disposed or the shared script fails or is removed.
   */
  readonly signal: AbortSignal
  dispose: () => void
  /**
   * Remove the shared script for every consumer. Use `dispose()` to release
   * only the registrations and resources owned by this scope.
   */
  remove: () => boolean
}

export interface ScriptInstance<T extends BaseScriptApi> {
  proxy: AsVoidFunctions<T>
  instance?: T
  id: string
  /**
   * Aborted when the script is removed or fails to load.
   */
  signal: AbortSignal
  status: Readonly<UseScriptStatus>
  entry?: ActiveHeadEntry<any>
  load: () => Promise<T>
  warmup: (rel: WarmupStrategy) => ActiveHeadEntry<any>
  remove: () => boolean
  setupTriggerHandler: (trigger: UseScriptOptions['trigger']) => () => void
  // cbs
  onLoaded: (fn: (instance: T) => void | Promise<void>, options?: EventHandlerOptions) => () => void
  onError: (fn: (err?: Error) => void | Promise<void>, options?: EventHandlerOptions) => () => void
  /**
   * @internal
   */
  _warmupStrategy?: string
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
  _setupTriggerHandler: (trigger: UseScriptOptions['trigger'], removeOnError?: boolean) => () => void
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
   * Create a consumer-owned handle without changing the shared script lifecycle.
   * Existing callers receive the cached shared script unless this is enabled.
   */
  scope?: boolean
  /** Reserved for source-less script overloads. */
  loader?: never
  /**
   * Resolve the script instance from the window. This legacy callback is always
   * called without arguments. It may return the API asynchronously.
   */
  use?: () => T | PromiseLike<T | undefined | null> | undefined | null
  /**
   * Resolve the script API with lifecycle helpers. Prefer this over `use` when
   * readiness needs an abort signal or `waitFor()` callback bridge.
   */
  resolve?: UseScriptResolver<T>
  /**
   * The trigger to load the script:
   * - `undefined` | `client` - (Default) Load the script on the client when this js is loaded.
   * - `manual` - Load the script manually by calling `$script.load()`, exists only on the client.
   * - `Promise` - Load the script when the promise resolves, exists only on the client.
   * - `Function` - Register a callback function to load the script, exists only on the client. It may return a cleanup function.
   * - `server` - Have the script injected on the server.
   */
  trigger?: 'client' | 'server' | 'manual' | Promise<boolean | void> | UseScriptTrigger | null
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

/** Options for a keyed, client-only resource that does not render a script tag. */
export type UseScriptLoaderOptions<T extends BaseScriptApi = BaseScriptApi> = Omit<UseScriptOptions<T>, 'loader' | 'resolve' | 'use' | 'warmupStrategy'> & {
  loader: UseScriptLoader<T>
  resolve?: never
  use?: never
  warmupStrategy?: never
}

export type UseScriptReturn<T extends Record<symbol | string, any>> = ScriptInstance<UseFunctionType<UseScriptOptions<T>, T>>

export type UseScriptScopeReturn<T extends Record<symbol | string, any>> = ScriptScope<UseFunctionType<UseScriptOptions<T>, T>>
