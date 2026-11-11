/**
 * Sentinel `HeadTag.tag` values for static plan rows (see `pushStaticPlan`).
 * Shared between `staticPlan.ts` (builds the tags) and `util/ssrRenderTags.ts`
 * (renders them) so the two stay in sync.
 *
 * @internal
 */
export const STATIC_TAG = '_static' as const
/** @internal */
export const STATIC_HTML_ATTRS_TAG = '_staticHtmlAttrs' as const
/** @internal */
export const STATIC_BODY_ATTRS_TAG = '_staticBodyAttrs' as const
