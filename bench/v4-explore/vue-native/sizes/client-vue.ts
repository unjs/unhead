// hypothetical vue-vnode client: core + compile + vue renderer glue, no fx
// renderer. NOT shippable (no SSR adoption, reorders, no script re-exec);
// bundled only to bound the byte saving the vue renderer could ever offer.
import { compileEntry, TitlePlugin } from '../../../../packages/unhead/src/v4/compile'
import { createCore } from '../../../../packages/unhead/src/v4/core'
import { createVueDomRenderer } from '../proto/vnode-client'

export function createHead() {
  const head = createCore({ ssr: false, compile: compileEntry })
  head.use(TitlePlugin)
  const r = createVueDomRenderer()
  let scheduled = false
  const push = head.push
  head.push = (input, opts) => {
    const e = push(input, opts)
    const invalidate = () => {
      if (!scheduled) {
        scheduled = true
        queueMicrotask(() => {
          scheduled = false
          r.apply(head.resolve(), document)
        })
      }
    }
    invalidate()
    return {
      patch: (n: unknown, f?: unknown[]) => {
        e.patch(n, f)
        invalidate()
      },
      dispose: () => {
        e.dispose()
        invalidate()
      },
    }
  }
  return head
}
