import type { HighlighterCore } from 'shiki'
import type { ComputedRef, MaybeRef } from 'vue'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

export const shiki: Ref<HighlighterCore | undefined> = ref()

export async function loadShiki(): Promise<HighlighterCore | undefined> {
  shiki.value = await createHighlighterCore({
    themes: [
      import('@shikijs/themes/vitesse-light'),
      import('@shikijs/themes/vitesse-dark'),
    ],
    langs: [
      import('@shikijs/langs/json'),
      import('@shikijs/langs/js'),
      import('@shikijs/langs/xml'),
    ],
    engine: createJavaScriptRegexEngine(),
  }).catch((err) => {
    console.warn('[unhead] Failed to load shiki highlighter:', err)
    return undefined
  })
  return shiki.value
}

export function useRenderCodeHighlight(code: MaybeRef<string>, lang: string): ComputedRef<string> {
  return computed(() => {
    if (!shiki.value)
      return ''
    return shiki.value.codeToHtml(toValue(code) || '', {
      lang,
      themes: {
        light: 'vitesse-light',
        dark: 'vitesse-dark',
      },
    }) || ''
  })
}
