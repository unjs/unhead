import { version } from 'vue'

export const Vue3 = version.startsWith('3')

export const IsBrowser = typeof window !== 'undefined'
