import type MagicString from 'magic-string'

export type RuleId
  = | 'prop-hid'
    | 'prop-vmid'
    | 'prop-children'
    | 'prop-body-true'
    | 'prop-render-priority'
    | 'meta-content-undefined'
    | 'render-ssr-head-await'
    | 'use-server-head'
    | 'use-server-seo-meta'
    | 'create-head-core'
    | 'legacy-entry-import'
    | 'pkg-schema'
    | 'pkg-shared'
    | 'pkg-addons'
    | 'vite-default-import'
    | 'entry-mode-option'
    | 'preload-missing-as'
    | 'custom-rel'
    | 'custom-script-type'
    | 'module-script-inline'
    | 'heterogeneous-tag-array'
    | 'removed-hook'
    | 'stream-server-manual'

export type Framework = 'vue' | 'react' | 'svelte' | 'solid' | 'angular' | 'unknown'

export interface ReportEntry {
  file: string
  line: number
  column: number
  ruleId: RuleId
  message: string
  fixed: boolean
}

export interface SourceLocation {
  line: number
  column: number
}

export interface RuleContext {
  file: string
  code: string
  framework: Framework
  s: MagicString
  resolveLocation: (offset: number) => SourceLocation
  report: (entry: Omit<ReportEntry, 'file'>) => void
}

export type NodeKind
  = | 'ImportDeclaration'
    | 'CallExpression'
    | 'ObjectExpression'
    | 'AwaitExpression'

export interface NodeVisit<Node = any> {
  node: Node
  parent: any
  ctx: RuleContext
  /** true when this object literal sits inside a head tag position (array item or prop value inside a head call). */
  isHeadTagObject?: boolean
  /** For object literals, the tag bucket they live in: 'link' | 'script' | 'meta' | 'style' | 'htmlAttrs' | 'bodyAttrs' | 'title' | 'unknown'. */
  tagKind?: TagKind
}

export type TagKind
  = | 'link'
    | 'script'
    | 'meta'
    | 'style'
    | 'noscript'
    | 'htmlAttrs'
    | 'bodyAttrs'
    | 'title'
    | 'titleTemplate'
    | 'base'
    | 'unknown'

export interface Rule {
  id: RuleId
  kinds: NodeKind[]
  visit: (v: NodeVisit) => void
}
