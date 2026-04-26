import type { Diagnostic, HeadInputView, PredicateContext, TagInput } from 'unhead/validate'
import type { ScriptBlock } from './sfc'
import type { CallGraph } from './walker'
import { readFile } from 'node:fs/promises'
import MagicString from 'magic-string'
import { parseSync } from 'oxc-parser'
import { extname } from 'pathe'
import { glob } from 'tinyglobby'
import {
  headInputPredicates,
  migrationTagPredicates,
  tagPredicates,
} from 'unhead/validate'
import { applyFix } from './applyFix'
import { materializeHeadInput, materializeTag } from './materialize'
import { extractScriptBlocks, langForExt } from './sfc'
import { collectImportedHelpers, extractCallGraph, HEAD_INPUT_CALLEES, walkHeadCalls } from './walker'

export type Mode = 'audit' | 'migrate'

export interface FileDiagnostic {
  ruleId: string
  message: string
  /** 1-based line in the original file source. */
  line: number
  /** 1-based column in the original file source. */
  column: number
  severity: 'error' | 'warning' | 'info'
}

export interface HeadCallSite {
  /** Identifier the call resolved to (`useHead`, `useSeoMeta`, `defineLink`, …). */
  name: string
  /** 1-based line in the original file source. */
  line: number
  /** 1-based column in the original file source. */
  column: number
}

export interface TitleObservation {
  /** Statically-resolved title or titleTemplate string. */
  value: string
  /** 1-based line in the original file source. */
  line: number
  /** 1-based column in the original file source. */
  column: number
  /** Composable that emitted it (`useHead`, `useSeoMeta`, `defineNuxtConfig`). */
  callee: string
}

export interface AuditFileResult {
  filePath: string
  diagnostics: FileDiagnostic[]
  /** Head/SEO calls found in the file — useful so users can confirm coverage. */
  headCalls: HeadCallSite[]
  /** Resolvable `title:` literals found in the file. */
  titles: TitleObservation[]
  /** Resolvable `titleTemplate:` literals found in the file. */
  titleTemplates: TitleObservation[]
  /** Migrated source if any fixes were applied. */
  output?: string
}

export interface RunOptions {
  patterns: string[]
  mode: Mode
  cwd: string
  ignore?: string[]
}

/**
 * Severity for each predicate ruleId in the recommended preset. The CLI uses
 * these to decide its exit code (any `error` → exit 1).
 */
const RECOMMENDED_SEVERITY: Record<string, 'error' | 'warning' | 'info'> = {
  'defer-on-module-script': 'warning',
  'empty-meta-content': 'warning',
  'deprecated-prop-children': 'error',
  'deprecated-prop-hid-vmid': 'error',
  'deprecated-prop-body': 'error',
  'html-in-title': 'warning',
  'possible-typo': 'warning',
  'non-absolute-canonical': 'warning',
  'numeric-tag-priority': 'warning',
  'preload-font-crossorigin': 'error',
  'preload-missing-as': 'error',
  'robots-conflict': 'error',
  'script-src-with-content': 'error',
  'twitter-handle-missing-at': 'warning',
  'viewport-user-scalable': 'warning',
  'prefer-define-helpers': 'warning',
}

function lineCol(source: string, offset: number): { line: number, column: number } {
  let line = 1
  let lastNL = -1
  for (let i = 0; i < offset; i++) {
    if (source.charCodeAt(i) === 10) {
      line++
      lastNL = i
    }
  }
  return { line, column: offset - lastNL }
}

interface AuditPiece {
  /** Source the parser sees (script block contents only for SFCs). */
  code: string
  /** Byte offset of `code` within the original file source (0 for plain JS/TS). */
  offset: number
  lang: ScriptBlock['lang']
}

function anchorOffset(node: any, diag: Diagnostic): number {
  if (!diag.at || diag.at.kind === 'tag')
    return node.start
  for (let i = node.properties.length - 1; i >= 0; i--) {
    const p = node.properties[i]
    const k = p.key
    const name = k?.type === 'Identifier'
      ? k.name
      : k?.type === 'Literal' && typeof k.value === 'string' ? k.value : undefined
    if (name !== diag.at.key)
      continue
    if (diag.at.kind === 'prop')
      return p.start
    if (diag.at.kind === 'prop-key')
      return p.key.start
    return p.value.start
  }
  return node.start
}

async function auditFile(
  filePath: string,
  source: string,
  pieces: AuditPiece[],
  predicateNames: string[],
  shouldFix: boolean,
): Promise<{ diagnostics: FileDiagnostic[], headCalls: HeadCallSite[], titles: TitleObservation[], titleTemplates: TitleObservation[], callGraph: CallGraph, output?: string }> {
  const diagnostics: FileDiagnostic[] = []
  const headCalls: HeadCallSite[] = []
  const titles: TitleObservation[] = []
  const titleTemplates: TitleObservation[] = []
  const callGraph: CallGraph = { functions: new Map(), allCalls: new Set() }
  const magic = shouldFix ? new MagicString(source) : undefined
  let edited = false

  for (const piece of pieces) {
    let parsed
    try {
      parsed = parseSync(filePath, piece.code, { sourceType: 'module', lang: piece.lang })
    }
    catch (err) {
      // Surface as a warning so users know coverage was skipped rather than
      // mistaking silent skip for a clean file. We do not type-check; this
      // only flags inputs the parser couldn't read at all.
      const message = err instanceof Error ? err.message : String(err)
      diagnostics.push({
        ruleId: 'parse-error',
        message: `skipped ${piece.lang} block: ${message}`,
        line: lineCol(source, piece.offset).line,
        column: 1,
        severity: 'warning',
      })
      continue
    }
    if (parsed.errors.length > 0) {
      const first = parsed.errors[0]
      diagnostics.push({
        ruleId: 'parse-error',
        message: `skipped ${piece.lang} block: ${first.message ?? 'parse error'}`,
        line: lineCol(source, piece.offset).line,
        column: 1,
        severity: 'warning',
      })
      continue
    }

    const program: any = parsed.program
    let importedHelpers: Map<string, string> | undefined

    const pieceGraph = extractCallGraph(program)
    for (const c of pieceGraph.allCalls) callGraph.allCalls.add(c)
    for (const [n, calls] of pieceGraph.functions) {
      const existing = callGraph.functions.get(n)
      if (existing) {
        for (const c of calls) existing.add(c)
      }
      else {
        callGraph.functions.set(n, new Set(calls))
      }
    }

    function emit(diag: Diagnostic, node: any): void {
      const absOffset = piece.offset + anchorOffset(node, diag)
      const { line, column } = lineCol(source, absOffset)
      diagnostics.push({
        ruleId: diag.ruleId,
        message: diag.message,
        line,
        column,
        severity: RECOMMENDED_SEVERITY[diag.ruleId] ?? 'warning',
      })
      if (shouldFix && magic && diag.fix) {
        if (applyFix(magic, node, diag.fix, piece.offset, piece.code))
          edited = true
      }
    }

    walkHeadCalls(program, {
      onCall(call, callee) {
        const { line, column } = lineCol(source, piece.offset + call.start)
        headCalls.push({ name: callee, line, column })
      },
      onHeadInput(input, callee) {
        const view: HeadInputView = materializeHeadInput(input, callee)
        if (view.props.title !== undefined) {
          const titleProp = (input.properties as any[]).find((p: any) => {
            const k = p.key
            return (k?.type === 'Identifier' && k.name === 'title')
              || (k?.type === 'Literal' && k.value === 'title')
          })
          if (titleProp) {
            const { line, column } = lineCol(source, piece.offset + titleProp.start)
            titles.push({ value: view.props.title, line, column, callee })
          }
        }
        if (view.props.titleTemplate !== undefined) {
          const tplProp = (input.properties as any[]).find((p: any) => {
            const k = p.key
            return (k?.type === 'Identifier' && k.name === 'titleTemplate')
              || (k?.type === 'Literal' && k.value === 'titleTemplate')
          })
          if (tplProp) {
            const { line, column } = lineCol(source, piece.offset + tplProp.start)
            titleTemplates.push({ value: view.props.titleTemplate, line, column, callee })
          }
        }
        for (const name of predicateNames) {
          const pred = (headInputPredicates as Record<string, any>)[name]
          if (!pred)
            continue
          for (const diag of pred(view) as Diagnostic[])
            emit(diag, input)
        }
      },
      onTag(tag, tagType, info) {
        const view: TagInput = materializeTag(tag, tagType as TagInput['tagType'], info.inArray)
        const ctx: PredicateContext = {
          get importedHelpers() {
            if (!importedHelpers)
              importedHelpers = collectImportedHelpers(program)
            return importedHelpers
          },
        }
        for (const name of predicateNames) {
          const pred = (tagPredicates as Record<string, any>)[name]
            ?? (migrationTagPredicates as Record<string, any>)[name]
          if (!pred)
            continue
          for (const diag of pred(view, ctx) as Diagnostic[])
            emit(diag, tag)
        }
      },
    })
  }

  return {
    diagnostics,
    headCalls,
    titles,
    titleTemplates,
    callGraph,
    output: edited && magic ? magic.toString() : undefined,
  }
}

const PAGE_PATH_RE = /[\\/]pages[\\/].+\.vue$/

function isPagePath(filePath: string): boolean {
  return PAGE_PATH_RE.test(filePath)
}

/**
 * Compute the set of identifier names that, when called, ultimately invoke
 * `useHead` / `useSeoMeta` (or their server/safe variants). Seeded with the
 * unhead composables and grown by fixpoint over the per-file call graphs:
 * any function whose body calls a name already in the set is added.
 */
function computeHeadProvidingCallees(graphs: CallGraph[]): Set<string> {
  const merged = new Map<string, Set<string>>()
  for (const g of graphs) {
    for (const [name, calls] of g.functions) {
      const existing = merged.get(name)
      if (existing) {
        for (const c of calls) existing.add(c)
      }
      else {
        merged.set(name, new Set(calls))
      }
    }
  }

  const set = new Set<string>(HEAD_INPUT_CALLEES)
  let changed = true
  while (changed) {
    changed = false
    for (const [name, calls] of merged) {
      if (set.has(name))
        continue
      for (const c of calls) {
        if (set.has(c)) {
          set.add(name)
          changed = true
          break
        }
      }
    }
  }
  return set
}

export async function runAudit(opts: RunOptions): Promise<AuditFileResult[]> {
  const files = await glob(opts.patterns, {
    cwd: opts.cwd,
    absolute: true,
    ignore: opts.ignore,
  })

  const shouldFix = opts.mode === 'migrate'
  const predicateNames = opts.mode === 'migrate'
    ? [...Object.keys(tagPredicates), ...Object.keys(headInputPredicates), ...Object.keys(migrationTagPredicates)]
    : [...Object.keys(tagPredicates), ...Object.keys(headInputPredicates)]

  const results: AuditFileResult[] = []
  const allGraphs: CallGraph[] = []
  const pageFiles: { filePath: string, callGraph: CallGraph, headCalls: HeadCallSite[], existingResultIdx: number }[] = []

  for (const filePath of files) {
    const source = await readFile(filePath, 'utf8')
    const ext = extname(filePath).toLowerCase()
    const lang = langForExt(ext)
    const pieces: AuditPiece[] = lang
      ? [{ code: source, offset: 0, lang }]
      : (ext === '.vue' || ext === '.svelte'
          ? extractScriptBlocks(source).map(b => ({ code: b.code, offset: b.offset, lang: b.lang }))
          : [])
    if (pieces.length === 0)
      continue
    const result = await auditFile(filePath, source, pieces, predicateNames, shouldFix)
    allGraphs.push(result.callGraph)

    const isPage = isPagePath(filePath)
    const hasInterestingResult = result.diagnostics.length > 0 || !!result.output || result.headCalls.length > 0

    const hasTitles = result.titles.length > 0 || result.titleTemplates.length > 0
    let resultIdx = -1
    if (hasInterestingResult || hasTitles) {
      resultIdx = results.length
      results.push({
        filePath,
        diagnostics: result.diagnostics,
        headCalls: result.headCalls,
        titles: result.titles,
        titleTemplates: result.titleTemplates,
        output: result.output,
      })
    }

    if (isPage && result.headCalls.length === 0) {
      pageFiles.push({ filePath, callGraph: result.callGraph, headCalls: result.headCalls, existingResultIdx: resultIdx })
    }
  }

  if (pageFiles.length > 0) {
    const headProviding = computeHeadProvidingCallees(allGraphs)
    for (const page of pageFiles) {
      let provides = false
      for (const c of page.callGraph.allCalls) {
        if (headProviding.has(c)) {
          provides = true
          break
        }
      }
      if (provides)
        continue
      const diag: FileDiagnostic = {
        ruleId: 'page-missing-head',
        message: 'Page does not call useHead/useSeoMeta directly or via a composable. Pages should set page-specific head metadata for SEO.',
        line: 1,
        column: 1,
        severity: 'info',
      }
      if (page.existingResultIdx >= 0) {
        results[page.existingResultIdx].diagnostics.push(diag)
      }
      else {
        results.push({ filePath: page.filePath, diagnostics: [diag], headCalls: [], titles: [], titleTemplates: [] })
      }
    }
  }

  return results
}

export function summarise(results: AuditFileResult[]): { errorCount: number, warningCount: number, infoCount: number, fileCount: number } {
  let errorCount = 0
  let warningCount = 0
  let infoCount = 0
  for (const r of results) {
    for (const d of r.diagnostics) {
      if (d.severity === 'error')
        errorCount++
      else if (d.severity === 'warning')
        warningCount++
      else
        infoCount++
    }
  }
  return { errorCount, warningCount, infoCount, fileCount: results.length }
}
