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

export interface SeoOverview {
  title: string
  description: string
  canonical: string
  robots: string
  ogTitle: string
  ogDescription: string
  ogImage: string
}

export interface SerializedValidationRule {
  id: string
  message: string
  severity: 'warn' | 'info'
  source?: string
  tagDedupeKey?: string
}

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
  /** The host page URL. The panel resolves relative head URLs against it. */
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
