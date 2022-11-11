import { version } from 'vue'
import { injectHead } from '.'

export const Vue3 = version.startsWith('3')

export const IsBrowser = typeof window !== 'undefined' || !!injectHead()?.resolvedOptions?.document
