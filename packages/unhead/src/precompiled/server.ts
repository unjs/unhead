import type { ServerUnhead } from 'unhead/server'
import type { ActiveHeadEntry, CreateServerHeadOptions, HeadEntryOptions, HeadRenderer, HeadTag, RenderSSRHeadOptions, ResolvableHead, SSRHeadPayload, Unhead, UseSeoMetaInput } from 'unhead/types'
import { precompiledHeadInput as createPrecompiledHeadInput } from '../precompiled'
import { createHeadWithRenderer, DEFAULT_INIT_TAGS } from '../server/createHead'
import { createServerRendererWithResolver } from '../server/renderSSRHead'
import { capoTagWeight as resolveCapoTagWeight } from '../server/sort'
import { resolvePrecompiledTags } from './resolve'

const createPrecompiledRenderer = (options?: RenderSSRHeadOptions) => createServerRendererWithResolver(resolvePrecompiledTags, options)

/**
 * Create an SSR head that accepts only build-precompiled entries.
 *
 * This strict entry lets bundlers remove the dynamic input normalizer. A
 * dynamic entry throws during resolution instead of silently disappearing.
 *
 * @experimental
 */
export function createHead<T = ResolvableHead>(options: CreateServerHeadOptions = {}): ServerUnhead<T> {
  // The ordinary default fast path is already preweighted with capo. A custom
  // weight needs the same normalized shapes but must run through weighting.
  if (!options.disableDefaults && options.tagWeight) {
    const defaults = DEFAULT_INIT_TAGS.map(tag => ({ ...tag, props: { ...tag.props } }))
    return createHeadWithRenderer<T>({
      ...options,
      disableDefaults: true,
      init: [precompiledHeadInput(defaults), ...(options.init || [])],
    }, createPrecompiledRenderer)
  }
  return createHeadWithRenderer<T>(options, createPrecompiledRenderer)
}

/** @experimental */
export function createServerRenderer(options?: RenderSSRHeadOptions): HeadRenderer<SSRHeadPayload> {
  return createPrecompiledRenderer(options)
}

/** @experimental */
export function renderSSRHead(head: Unhead<any>, options?: RenderSSRHeadOptions): SSRHeadPayload {
  return createPrecompiledRenderer(options)(head)
}

type PrecompiledEntryOptions = HeadEntryOptions & { head: Unhead<any> }

/** SSR composable for transformed calls using this strict entry. @experimental */
export function useHead<I = ResolvableHead>(input: ResolvableHead, options: PrecompiledEntryOptions): ActiveHeadEntry<I> {
  return options.head.push(input || {}, options) as ActiveHeadEntry<I>
}

/**
 * Preserved only for untransformed calls, which the strict resolver rejects.
 * Static calls are lowered to {@link useHead} by the bundler plugin.
 * @experimental
 */
export function useSeoMeta(input: UseSeoMetaInput, options: PrecompiledEntryOptions): ActiveHeadEntry<UseSeoMetaInput> {
  return useHead(input as ResolvableHead, options)
}

/** Resolve the default server tag weight. */
export function capoTagWeight(tag: HeadTag): number {
  return resolveCapoTagWeight(tag)
}

type PrecompiledHeadTag = Omit<HeadTag, 'props'> & { props: Record<string, any> }

/** Wrap build-normalized tags for the experimental precompile runtime. @experimental */
export function precompiledHeadInput(source: PrecompiledHeadTag[]): ResolvableHead {
  return createPrecompiledHeadInput(source)
}

export { resolvePrecompiledTags as resolveTags }
