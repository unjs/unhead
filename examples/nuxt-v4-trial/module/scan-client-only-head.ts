/**
 * Heuristic enforcement for the gap V4_DESIGN.md 15.3 flags: recordRouteHead
 * only sees what runs during SSR. A `useHead()` call gated behind
 * `onMounted`/`watch`/`import.meta.client` never executes server-side, so it
 * is invisible to the double-render hash and would silently corrupt a
 * "runtimeOmittable" verdict: the client mounts, calls the composable, and
 * finds no injected head instance because the build shipped without one.
 *
 * This is a source-level AST heuristic (oxc-parser over the `<script setup>`
 * block), NOT the static analyzer this whole prototype exists to sidestep.
 * It only proves ABSENCE of the specific shape it looks for; a re-exported
 * wrapper composable, a dynamically computed callee, or a call reached via
 * an intermediate function it does not trace through can still slip past.
 * Treat a clean scan as "no known disqualifier found", never as a proof of
 * safety, and prefer false positives (over-disqualify) to false negatives.
 */
import { parseSync } from 'oxc-parser'

const HEAD_COMPOSABLES = new Set(['useHead', 'useSeoMeta', 'useServerHead', 'useServerSeoMeta', 'useHeadSafe'])
const CLIENT_LIFECYCLE = new Set(['onMounted', 'onBeforeMount', 'onUpdated', 'onBeforeUpdate', 'watch', 'watchEffect', 'watchPostEffect', 'nextTick'])
const CLIENT_GUARD_RE = /import\.meta\.client|process\.client/

const SCRIPT_SETUP_RE = /<script[^>]*\bsetup\b[^>]*>([\s\S]*?)<\/script>/

function lineAt(source: string, pos: number): number {
  let line = 1
  for (let i = 0; i < pos && i < source.length; i++) {
    if (source[i] === '\n')
      line++
  }
  return line
}

/**
 * Scan a Vue SFC's `<script setup>` block for head-composable calls that can
 * only run on the client. Returns human-readable findings; empty means
 * "no known disqualifier found" (see module doc: not a safety proof).
 */
export function scanScriptForClientOnlyHead(filename: string, source: string): string[] {
  const match = SCRIPT_SETUP_RE.exec(source)
  const scriptGroup = match?.[1]
  if (!match || scriptGroup === undefined)
    return []
  const script = scriptGroup
  const scriptOffset = match.index + match[0].indexOf(script)
  const findings: string[] = []
  const stack: any[] = []

  let parsed: ReturnType<typeof parseSync>
  try {
    parsed = parseSync(`${filename.replace(/\.vue$/, '')}.tsx`, script, { sourceType: 'module' })
  }
  catch (error) {
    // A parse failure must not be swallowed into "no findings": that would
    // silently pass an unscannable file as safe. Disqualify loudly instead.
    return [`could not parse <script setup> in ${filename}: ${(error as Error).message}`]
  }
  // oxc-parser is error-tolerant: it returns a best-effort AST plus an
  // `errors` array instead of throwing. Silently walking a partial AST for a
  // syntax-broken file would be the exact "silent fallback" the rules forbid.
  if (parsed.errors.length)
    return [`could not parse <script setup> in ${filename}: ${parsed.errors[0]!.message}`]

  const visit = (node: any): void => {
    if (!node || typeof node !== 'object')
      return
    if (Array.isArray(node)) {
      for (const n of node) visit(n)
      return
    }
    if (typeof node.type !== 'string') {
      for (const key in node) {
        if (key !== 'parent')
          visit(node[key])
      }
      return
    }

    if (node.type === 'CallExpression' && node.callee?.type === 'Identifier' && HEAD_COMPOSABLES.has(node.callee.name)) {
      const lifecycleGuard = stack.find(n => n.type === 'CallExpression' && CLIENT_LIFECYCLE.has(n.callee?.name))
      const ifGuard = stack.find(n => n.type === 'IfStatement' && n.test && CLIENT_GUARD_RE.test(script.slice(n.test.start, n.test.end)))
      if (lifecycleGuard || ifGuard) {
        const line = lineAt(source, scriptOffset + node.start)
        const via = lifecycleGuard ? `inside ${lifecycleGuard.callee.name}()` : 'behind an import.meta.client/process.client guard'
        findings.push(`${node.callee.name}() at ${filename}:${line} runs ${via}; invisible to SSR recording and disqualifies runtime omission`)
      }
    }

    let pushed = false
    if (node.type === 'CallExpression' || node.type === 'IfStatement') {
      stack.push(node)
      pushed = true
    }
    for (const key in node) {
      if (key === 'parent')
        continue
      visit(node[key])
    }
    if (pushed)
      stack.pop()
  }

  visit(parsed.program)
  return findings
}
