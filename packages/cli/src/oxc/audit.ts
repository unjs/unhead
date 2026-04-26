import type { Diagnostic, HeadInputView, PredicateContext, TagInput } from 'unhead/validate'
import type { ScriptBlock } from './sfc'
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
import { collectImportedHelpers, walkHeadCalls } from './walker'

export type Mode = 'audit' | 'migrate'

export interface FileDiagnostic {
  ruleId: string
  message: string
  /** 1-based line in the original file source. */
  line: number
  /** 1-based column in the original file source. */
  column: number
  severity: 'error' | 'warning'
}

export interface AuditFileResult {
  filePath: string
  diagnostics: FileDiagnostic[]
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
const RECOMMENDED_SEVERITY: Record<string, 'error' | 'warning'> = {
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
): Promise<{ diagnostics: FileDiagnostic[], output?: string }> {
  const diagnostics: FileDiagnostic[] = []
  const magic = shouldFix ? new MagicString(source) : undefined
  let edited = false

  for (const piece of pieces) {
    let parsed
    try {
      parsed = parseSync(filePath, piece.code, { sourceType: 'module', lang: piece.lang })
    }
    catch {
      // Parse failure on a piece is not surfaced — the goal is to lint head
      // usage, not type-check. A real parse error is the project's concern.
      continue
    }
    if (parsed.errors.length > 0)
      continue

    const program: any = parsed.program
    let importedHelpers: Set<string> | undefined

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
      onHeadInput(input, callee) {
        const view: HeadInputView = materializeHeadInput(input, callee)
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
    output: edited && magic ? magic.toString() : undefined,
  }
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
    if (result.diagnostics.length === 0 && !result.output)
      continue
    results.push({ filePath, diagnostics: result.diagnostics, output: result.output })
  }
  return results
}

export function summarise(results: AuditFileResult[]): { errorCount: number, warningCount: number, fileCount: number } {
  let errorCount = 0
  let warningCount = 0
  for (const r of results) {
    for (const d of r.diagnostics) {
      if (d.severity === 'error')
        errorCount++
      else
        warningCount++
    }
  }
  return { errorCount, warningCount, fileCount: results.length }
}
