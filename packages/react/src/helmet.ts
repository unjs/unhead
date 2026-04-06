import type { ReactNode } from 'react'
import type { ActiveHeadEntry, Unhead, ResolvableHead as UseHeadInput } from 'unhead/types'
import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { createDebouncedFn, createDomRenderer, createHead as _createHead } from 'unhead/client'
import { HasElementTags, TagsWithInnerContent, ValidHeadTags } from 'unhead/utils'
import { UnheadContext } from './context'

let _singletonHead: Unhead | null = null

function useHelmetHead(): Unhead {
  const ctx = useContext<Unhead | null>(UnheadContext)
  if (ctx) {
    return ctx
  }
  // Lazily create a singleton client head when no provider is present (client-only)
  if (!_singletonHead) {
    if (typeof window === 'undefined') {
      throw new Error('Helmet requires UnheadProvider on the server. Wrap your app with <UnheadProvider>.')
    }
    const domRenderer = createDomRenderer()
    let head: ReturnType<typeof _createHead<UseHeadInput>>
    const debouncedRenderer = createDebouncedFn(() => domRenderer(head), fn => setTimeout(fn, 0))
    head = _createHead<UseHeadInput>({ render: debouncedRenderer })
    _singletonHead = head
  }
  return _singletonHead!
}

export interface HelmetProps {
  children?: ReactNode
  /**
   * A default title to use when no `<title>` child is provided.
   *
   * Equivalent to react-helmet's `defaultTitle`.
   */
  defaultTitle?: string
  /**
   * A template for the title. Use `%s` as a placeholder for the page title.
   *
   * @example `%s | My Site`
   */
  titleTemplate?: string
  /**
   * Called after the document head has been updated in the browser.
   *
   * Equivalent to react-helmet's `onChangeClientState`.
   *
   * @param newState - The new head state after rendering.
   * @param addedTags - Always empty — unhead manages DOM diffing internally.
   * @param removedTags - Always empty — unhead manages DOM diffing internally.
   */
  onChangeClientState?: (newState: Record<string, any>, addedTags: Record<string, HTMLElement[]>, removedTags: Record<string, HTMLElement[]>) => void
  /**
   * Whether to encode special characters in attributes.
   *
   * @default true
   * @deprecated Unhead handles encoding automatically. This prop is accepted for compatibility but has no effect.
   */
  encodeSpecialCharacters?: boolean
  /**
   * Whether to defer DOM updates until the browser is idle.
   *
   * @default true
   * @deprecated Unhead batches DOM updates automatically. This prop is accepted for compatibility but has no effect.
   */
  defer?: boolean
}

/**
 * A react-helmet compatible component powered by unhead.
 *
 * Drop-in replacement for `<Helmet>` — import from `@unhead/react/helmet` instead of `react-helmet`.
 *
 * @example
 * ```tsx
 * import { Helmet } from '@unhead/react/helmet'
 *
 * <Helmet
 *   defaultTitle="My Site"
 *   titleTemplate="%s | My Site"
 *   onChangeClientState={(newState) => console.log(newState)}
 * >
 *   <title>Page Title</title>
 *   <meta name="description" content="Page description" />
 * </Helmet>
 * ```
 */
const Helmet: React.FC<HelmetProps> = ({
  children,
  defaultTitle,
  titleTemplate,
  onChangeClientState,
  // accepted for compat, intentionally unused
  encodeSpecialCharacters: _encodeSpecialCharacters,
  defer: _defer,
}) => {
  const head = useHelmetHead()

  const processedElements = useMemo(() =>
    React.Children.toArray(children).filter(React.isValidElement), [children])

  const getHeadChanges = useCallback(() => {
    const input: UseHeadInput = {}

    if (titleTemplate) {
      input.titleTemplate = titleTemplate
    }

    let hasTitle = false
    for (const element of processedElements) {
      const reactElement = element as React.ReactElement
      const { type, props } = reactElement
      const tagName = String(type)

      if (!ValidHeadTags.has(tagName)) {
        continue
      }

      const data: Record<string, any> = { ...(typeof props === 'object' ? props : {}) }

      if (TagsWithInnerContent.has(tagName) && data.children != null) {
        const contentKey = tagName === 'script' ? 'innerHTML' : 'textContent'
        data[contentKey] = Array.isArray(data.children)
          ? data.children.map(String).join('')
          : String(data.children)
      }
      delete data.children

      if (tagName === 'title') {
        hasTitle = true
      }

      if (HasElementTags.has(tagName)) {
        const key = tagName as keyof UseHeadInput
        if (!Array.isArray(input[key])) {
          // @ts-expect-error untyped
          input[key] = []
        }
        (input[key] as any[])!.push(data)
      }
      else {
        // @ts-expect-error untyped
        input[tagName as keyof UseHeadInput] = data
      }
    }

    // Apply defaultTitle when no <title> child is provided
    if (!hasTitle && defaultTitle) {
      input.title = defaultTitle
    }

    // Pass defaultTitle through templateParams for titleTemplate support
    if (defaultTitle) {
      input.templateParams = {
        ...input.templateParams as any,
        defaultTitle,
      }
    }

    return input
  }, [processedElements, titleTemplate, defaultTitle])

  const headRef = useRef<ActiveHeadEntry<any> | null>(null)

  // Map onChangeClientState to unhead's onRendered hook
  const onChangeClientStateRef = useRef(onChangeClientState)
  onChangeClientStateRef.current = onChangeClientState

  useEffect(() => {
    const options: Record<string, any> = {
      onRendered: () => {
        const cb = onChangeClientStateRef.current
        if (!cb)
          return
        // Build a state object similar to react-helmet's onChangeClientState
        const titleEl = document.querySelector('title')
        const state: Record<string, any> = {
          title: titleEl?.textContent || '',
        }
        // Collect current meta/link/script tags
        for (const tag of ['meta', 'link', 'script', 'style', 'base'] as const) {
          state[`${tag}Tags`] = Array.from(document.querySelectorAll(`head ${tag}`))
        }
        // addedTags/removedTags are always empty since unhead manages DOM diffing internally
        cb(state, {}, {})
      },
    }
    headRef.current = head.push(getHeadChanges(), options)
    return () => {
      headRef.current?.dispose()
      headRef.current = null
    }
  }, [head])

  useEffect(() => {
    headRef.current?.patch(getHeadChanges())
  }, [getHeadChanges])

  return null
}

export { Helmet }
