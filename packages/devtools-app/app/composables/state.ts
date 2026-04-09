import { ref } from 'vue'

export interface SeoOverview {
  title: string
  description: string
  canonical: string
  robots: string
  ogTitle: string
  ogDescription: string
  ogImage: string
}

export type TagRenderMode = 'server' | 'client' | 'hydrated' | 'stream'

export interface SerializedEntry {
  id: number
  source?: string
  input: Record<string, any>
  tagCount: number
  mode: TagRenderMode
}

export interface SerializedTag {
  tag: string
  props: Record<string, string>
  innerHTML?: string
  textContent?: string
  position?: string
  priority?: number
  order?: number
  dedupeKey?: string
  source?: string
  mode: TagRenderMode
}

export interface SerializedScript {
  id: string
  src: string
  status: string
  warmupStrategy?: string
  events: { type: string, timestamp: number }[]
  fetchpriority?: string
  crossorigin?: string
  defer?: boolean
  async?: boolean
}

export interface SerializedValidationRule {
  id: string
  message: string
  severity: 'warn' | 'info'
  source?: string
  tagDedupeKey?: string
}

export interface UnheadDevtoolsState {
  version: string
  entries: SerializedEntry[]
  tags: SerializedTag[]
  plugins: string[]
  title: string
  scripts: SerializedScript[]
  seo: SeoOverview
  titleTemplate: string | null
  templateParams: Record<string, any> | null
  separator: string
  ssr: boolean
  dirty: boolean
  domElementCount: number
  tagTypeCounts: Record<string, number>
  validationRules: SerializedValidationRule[]
}

const defaultState: UnheadDevtoolsState = {
  version: '',
  entries: [],
  tags: [],
  plugins: [],
  title: '',
  scripts: [],
  seo: { title: '', description: '', canonical: '', robots: '', ogTitle: '', ogDescription: '', ogImage: '' },
  titleTemplate: null,
  templateParams: null,
  separator: '|',
  ssr: false,
  dirty: false,
  domElementCount: 0,
  tagTypeCounts: {},
  validationRules: [],
}

export const state = ref<UnheadDevtoolsState>({ ...defaultState })
export const isConnected = ref(false)

export function syncState(newState: UnheadDevtoolsState) {
  if (!newState)
    return
  state.value = newState
}
