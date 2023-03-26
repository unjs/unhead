import { computeHashes, defineHeadPlugin } from '@unhead/shared/dist'

let prevHash: string | false = false

export const HashHydrationPlugin = () => {
  return defineHeadPlugin((head) => {
    return {
      hooks: {
        'dom:beforeRender': function (ctx) {
          // if enabled, we may be able to skip the entire dom render
          prevHash = prevHash || head.state.hash || false
          if (prevHash) {
            const hash = computeHashes(ctx.tags.map(ctx => ctx.tag._h!))
            // the SSR hash matches the CSR hash, we can skip the render
            if (prevHash === hash)
              ctx.shouldRender = false

            prevHash = hash
          }
        },
      },
    }
  })
}
