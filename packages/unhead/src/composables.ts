import type {
  ActiveHeadEntry,
  CompatibleHead,
  HeadEntryOptions,
  HeadSafe,
  ResolvableHead,
  Unhead,
  UseSeoMetaInput,
} from './types'
import { FlatMetaPlugin } from './plugins/flatMeta'
import { SafeInputPlugin } from './plugins/safe'

export function useHead<Input, RenderResult>(unhead: Unhead<Input, RenderResult>, input: NoInfer<Input>, options?: HeadEntryOptions<Input>): ActiveHeadEntry<Input>
export function useHead<RenderResult>(unhead: Unhead<ResolvableHead, RenderResult>): ActiveHeadEntry<ResolvableHead>
export function useHead<Input, RenderResult>(unhead: Record<never, never> extends Input ? Unhead<Input, RenderResult> : never): ActiveHeadEntry<Input>
export function useHead<Input = ResolvableHead, RenderResult = unknown>(unhead: Unhead<Input, RenderResult>, input?: Input, options: HeadEntryOptions<Input> = {}): ActiveHeadEntry<Input> {
  input = arguments.length > 1 ? input as Input : {} as Input
  return unhead.push(input, options)
}

export function useHeadSafe<HeadInput, RenderResult>(unhead: CompatibleHead<HeadInput, ResolvableHead, RenderResult>, input: HeadSafe = {}, options: HeadEntryOptions<HeadInput> = {}): ActiveHeadEntry<HeadSafe> {
  unhead.use(SafeInputPlugin)
  return useHead(
    unhead as unknown as Unhead<ResolvableHead, RenderResult>,
    input as ResolvableHead,
    Object.assign(options, { _safe: true }) as unknown as HeadEntryOptions<ResolvableHead>,
  ) as ActiveHeadEntry<HeadSafe>
}

export function useSeoMeta<HeadInput, RenderResult>(unhead: CompatibleHead<HeadInput, ResolvableHead, RenderResult>, input: UseSeoMetaInput = {}, options?: HeadEntryOptions<HeadInput>): ActiveHeadEntry<UseSeoMetaInput> {
  unhead.use(FlatMetaPlugin)
  function normalize(input: UseSeoMetaInput) {
    if ('_flatMeta' in input) {
      return input
    }
    const meta: Record<string, unknown> = {}
    for (const key in input) {
      if (!Object.hasOwn(input, key) || key === 'title' || key === 'titleTemplate')
        continue
      meta[key] = input[key as keyof UseSeoMetaInput]
    }
    return {
      title: input.title,
      titleTemplate: input.titleTemplate,
      _flatMeta: meta,
    }
  }
  const entry = (unhead as unknown as Unhead<UseSeoMetaInput, RenderResult>).push(
    normalize(input),
    options as unknown as HeadEntryOptions<UseSeoMetaInput>,
  ) as ActiveHeadEntry<UseSeoMetaInput> & { __patched?: boolean }
  // just in case
  const corePatch = entry.patch
  if (!entry.__patched) {
    entry.patch = input => corePatch(normalize(input))
    entry.__patched = true
  }
  return entry
}

export { useScript } from './scripts'
