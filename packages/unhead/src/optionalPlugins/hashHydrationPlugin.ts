import { defineHeadPlugin } from '@unhead/shared'

/**
 * @deprecated Hash hydration is no longer supported. Please remove this plugin.
 */

/* @__NO_SIDE_EFFECTS__ */ export function HashHydrationPlugin() {
  return defineHeadPlugin({})
}
