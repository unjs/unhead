/**
 * v3 client page: idiomatic v3 API. The client adapter renders synchronously
 * on every push/patch (entries:updated hook), so hydration is 7 sync renders
 * and each navigation patch is one sync render; no manual flush exists.
 */
import { createHead } from '../../../../packages/unhead/src/client'
import { ENTRIES, ROUTE_HEAD_A, ROUTE_HEAD_B } from './entries'
import { run } from './runner'

run({
  label: 'v3',
  hydrate() {
    const head = createHead()
    let page: any
    for (const [input, opts] of ENTRIES)
      page = head.push(input as any, opts)
    return toB => page.patch(toB ? ROUTE_HEAD_B : ROUTE_HEAD_A)
  },
})
