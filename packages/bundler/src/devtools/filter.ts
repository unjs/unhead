/**
 * Transform filter shared by the devtools plugin and its lazy proxy.
 *
 * The proxy declares the hook filter that actually gates the real plugin's
 * handler, so both sides must agree. Keeping one copy here removes the drift.
 */
export const HEAD_COMPOSABLES = ['useHead', 'useSeoMeta', 'useHeadSafe', 'useScript']

export const HEAD_COMPOSABLE_RE = new RegExp(`\\b(?:${HEAD_COMPOSABLES.join('|')})\\b`)
