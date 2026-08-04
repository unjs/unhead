/**
 * v4 client page: idiomatic v4 API. Renders are microtask-batched by default;
 * for deterministic timing the demo injects a no-op scheduler and flushes
 * synchronously via head.render() (the injectable scheduler seam exists for
 * exactly this). Hydration is 7 pushes + one flush.
 */
import { createHead } from '../../../../packages/unhead/src/v4/client'
import { ENTRIES, ROUTE_HEAD_A, ROUTE_HEAD_B } from './entries'
import { run } from './runner'

run({
  label: 'v4',
  hydrate() {
    const head = createHead({ scheduler: () => {} })
    let page: any
    for (const [input, opts] of ENTRIES)
      page = head.push(input, opts)
    head.render()
    return (toB) => {
      page.patch(toB ? ROUTE_HEAD_B : ROUTE_HEAD_A)
      head.render()
    }
  },
})
