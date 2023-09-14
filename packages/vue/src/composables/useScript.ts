import { hashCode } from '@unhead/shared'
import { computed, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Head, HeadEntryOptions, Script } from '@unhead/schema'
import type { UseHeadOptions } from '@unhead/vue'
import { resolveUnrefHeadInput } from '../utils'
import { injectHead } from './injectHead'

const requestIdleCallback: Window['requestIdleCallback'] = typeof window === 'undefined'
  ? (() => {}) as any
  : (globalThis.requestIdleCallback || ((cb) => {
      const start = Date.now()
      const idleDeadline = {
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      }
      return setTimeout(() => { cb(idleDeadline) }, 1)
    }))

export interface UseScriptOptions<T> extends Omit<UseHeadOptions, 'transform'> {
  use?: () => T | undefined | null
  trigger?: 'idle' | Promise<void>
  mock?: Record<string | symbol, any>
  transform?: (script: Script) => Script
}

export type UseScriptStatus = 'awaitingLoad' | 'loading' | 'loaded' | 'error'

export interface ScriptInstance<T> {
  loaded: ComputedRef<boolean>
  status: Ref<UseScriptStatus>
  error: Ref<Error | null>
  // use: () => T | undefined | null
  // only if success
  load: () => Promise<void>
  waitForUse: () => Promise<T>
}

export type UseScriptInput = Omit<Script, 'onload' | 'src'> & Required<Pick<Script, 'src'>>

export function useScript<T>(input: UseScriptInput, _options?: UseScriptOptions<T>): T & { $script: ScriptInstance<T> } {
  const head = injectHead()
  const options = _options || {}
  const resolved = resolveUnrefHeadInput(input) || {} as Script
  const key = `script-${hashCode(resolved.key || resolved.src)}`
  if (head._scripts?.[key])
    return head._scripts[key]

  async function transform(entry: Head) {
    options.transform = options.transform || ((input: Script) => input)
    return { script: [options.transform(entry.script![0] as Script)] }
  }

  // const instance = getCurrentInstance()

  const insert = () => {
    head.push({
      script: [
        { ...resolved, key },
      ],
    }, {
      ...options as any as HeadEntryOptions,
      transform: transform as (input: unknown) => unknown,
    })
  }

  const script: ScriptInstance<T> = {
    status: ref('awaitingLoad'),
    error: ref(null),
    loaded: computed(() => false),
    load: () => Promise.resolve(),
    waitForUse: () => new Promise(() => {}),
  }

  if (head.ssr) {
    // if we don't have a trigger we can insert the script right away
    if (!options.trigger)
      insert()
  }
  else {
    // hydrating a ssr script has limited support for events, we need to trigger them a bit differently
    // TODO handle errors
    const isHydrating = !!document.querySelector(`script[data-hid="${hashCode(key)}"]`)
    if (isHydrating) {
      script.status!.value = 'loading'
      script.load = () => new Promise<T>((resolve, reject) => {
        // covers sync scripts and when events have already fired
        function doResolveTest() {
          const api = options.use()
          if (api)
            return resolve(api)
          return false
        }

        doResolveTest()
        // simple defer is easy
        if (resolved.defer && !resolved.async) {
          // if dom is already loaded and script use failed, we have an error
          if (document.readyState === 'complete')
            return reject(new Error('Script was not found'))
          // setup promise after DOMContentLoaded
          document.addEventListener('DOMContentLoaded', doResolveTest, { once: true })
        }
        // with async we need to wait for idle callbacks (onNuxtReady)
        else if (resolved.async) {
          // check if window is already loaded
          if (document.readyState === 'complete')
            return reject(new Error('Script was not found'))
          // on window load
          window.addEventListener('load', doResolveTest, { once: true })
        }
        else {
          requestIdleCallback(() => {
            // idle timeout, must be loaded here
            if (!doResolveTest())
              reject(new Error('Script not found'))
          })
        }
      })
        .then(() => {
          script.status!.value = 'loaded'
        })
        .catch(() => {
          script.status!.value = 'error'
        })
    }
    else {
      // check if it already exists
      let startScriptLoadPromise = Promise.resolve()
      // change mode to client
      if (options.trigger === 'idle')
        // @ts-expect-error untyped
        startScriptLoadPromise = new Promise(resolve => requestIdleCallback(resolve))
      // check if input is a promise
      else if (options.trigger instanceof Promise)
        startScriptLoadPromise = options.trigger

      // when inserting client sided we can use the event handlers
      resolved.onload = () => {
        script.status.value = 'loaded'
        console.log('onload')
        // instance && instance.runWithContext(onload)
      }

      // TODO handle sync script
      head.hooks.hook('dom:renderTag', (ctx) => {
        if (ctx.tag.key === key && ctx.tag.innerHTML) {
          // trigger the onload if the script is using innerHTML
          script.status.value = 'loaded'
        }
      })

      startScriptLoadPromise
        .then(() => {
          script.status!.value = 'loading'
          insert()
        })
        .catch(e => script.error.value = e)

      script.waitForUse = () => new Promise<T>((resolve) => {

      })
      // script.load = () => new Promise<T>((resolve, reject) => {
      //   if (script.status.value === 'awaitingLoad') {
      //     script.status!.value = 'loading'
      //     insert()
      //   }
      // })
      // script.waitForUse = () => new Promise<T>((resolve, reject) => {
      //
      // })
      //
      script.waitForUse = () => new Promise<T>((resolve) => {
        if (script.status.value === 'loaded')
          return resolve(options.use())
        // watch for status change
        const unregister = watch(script.status, () => {
          if (script.status.value === 'loaded') {
            unregister()
            resolve(options.use())
          }
        })
      })
    }
  }

  const instance = new Proxy({}, {
    get(_, fn) {
      if (fn === '$script')
        return script
      if (options?.mock?.[fn])
        return options.mock[fn]
      return (...args: any[]) => {
        // third party scripts only run on client-side, mock the function
        if (head.ssr)
          return
        // TODO mock invalid environments
        if (script.loaded.value) {
          const api = options.use()
          // @ts-expect-error untyped
          return api[fn](...args)
        }
        else {
          return script.waitForUse().then(
            (api) => {
              // @ts-expect-error untyped
              api[fn](...args)
            },
          )
        }
      }
    },
  }) as any as T & { $script: ScriptInstance<T> }
  head._scripts = head._scripts || {}
  head._scripts[key] = instance
  return instance
}
