import { defineHeadPlugin } from '@unhead/shared'

export const WebWorkerResolverPlugin = defineHeadPlugin((head) => {
  // @ts-expect-error untyped
  let worker
  head.hooks.hook('init', async () => {
    // Create a new worker instance
    const workerCode = new Blob(await import(String('unhead/webworker-worker')), {
      type: 'application/javascript',
    })
    const workerURL = URL.createObjectURL(workerCode)
    worker = new Worker(workerURL, { type: 'module' })
  })

  head.hooks.hook('entries:resolve', async (ctx) => {
    await new Promise<void>((resolve) => {
      // @ts-expect-error untyped
      worker.addEventListener('message', (event) => {
        const { type } = event.data
        switch (type) {
          case 'entries:resolve':
            Object.assign(ctx, event.data.payload)
            break
        }
        resolve()
      })
      // @ts-expect-error untyped
      worker.postMessage({ type: 'entries:resolve', payload: ctx })
    })
  })

  // Handle worker errors
  // @ts-expect-error untyped
  worker.addEventListener('error', (error) => {
    console.error('Worker failed:', error)
  })
  return {}
})
