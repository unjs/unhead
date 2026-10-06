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
  /** Encoded body size from Resource Timing; absent when the host hides it (no Timing-Allow-Origin). */
  size?: number
}

export interface SerializedValidationRule {
  id: string
  message: string
  severity: 'warn' | 'info'
  source?: string
  tagDedupeKey?: string
}

// Lint result types — kept in sync with packages/bundler/src/devtools/rpc/types.ts
// (mirrored here rather than imported from a published subpath, matching the
// existing duplication pattern for the other Serialized* types in this file).
export interface LintMessage {
  ruleId: string | null
  message: string
  severity: 'error' | 'warn' | 'info'
  line?: number
  column?: number
}

export interface LintFileResult {
  filePath: string
  relativePath: string
  errorCount: number
  warningCount: number
  messages: LintMessage[]
  /** `migrate` rewrote this file, or would with `dryRun`. */
  fixed: boolean
  /** Fingerprint of the source and proposed migration. */
  fingerprint?: string
}

export interface LintRunResult {
  available: true
  mode: 'audit' | 'migrate'
  dryRun: boolean
  files: LintFileResult[]
  errorCount: number
  warningCount: number
  filesFixed: number
  durationMs: number
}

export interface LintUnavailableResult {
  available: false
  message: string
}

export type LintResponse = LintRunResult | LintUnavailableResult

export interface UnheadDevtoolsConfig {
  cwd: string
  mode: 'dev' | 'build'
  /** Installed `unhead` version; empty when it cannot be resolved. */
  version: string
}

export interface UnheadDevtoolsState {
  /** The host page URL. Relative head URLs resolve against it. */
  url: string
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
  url: '',
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
/**
 * `waiting`: the page script has not answered within the grace period. The
 * channel keeps retrying, so a late page script still connects.
 */
export type ConnectionStatus = 'connecting' | 'waiting' | 'connected'
export const connectionStatus = ref<ConnectionStatus>('connecting')
export const unheadVersion = ref('')

/**
 * Resolve a URL from the page's head against the page itself. The panel lives
 * under `/__unhead/`, so a relative URL would otherwise resolve against the panel.
 */
export function resolvePageUrl(url: string): string {
  try {
    return new URL(url, state.value.url || location.href).href
  }
  catch {
    // Not a parseable URL; show it as written.
    return url
  }
}

/** The host page's hostname, for previews when no canonical URL is set. */
export function pageHost(): string {
  try {
    return new URL(state.value.url).hostname
  }
  catch {
    return ''
  }
}

export function syncState(newState: UnheadDevtoolsState) {
  if (!newState)
    return
  state.value = newState
}
