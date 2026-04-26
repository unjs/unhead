import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runAudit, summarise } from '../src/oxc/audit'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = resolve(__dirname, 'fixtures')

describe('runAudit (audit)', () => {
  it('reports diagnostics for the bad TS fixture without parse errors', async () => {
    const results = await runAudit({
      patterns: ['bad.ts'],
      mode: 'audit',
      cwd: fixturesDir,
    })
    expect(results).toHaveLength(1)
    const ruleIds = results[0].diagnostics.map(d => d.ruleId).sort()
    expect(ruleIds).toEqual([
      'defer-on-module-script',
      'html-in-title',
      'non-absolute-canonical',
      'preload-font-crossorigin',
      'robots-conflict',
      'twitter-handle-missing-at',
    ].sort())
  })

  it('parses .vue files via the script extractor', async () => {
    const results = await runAudit({
      patterns: ['bad.vue'],
      mode: 'audit',
      cwd: fixturesDir,
    })
    expect(results).toHaveLength(1)
    const ruleIds = results[0].diagnostics.map(d => d.ruleId).sort()
    expect(ruleIds).toContain('html-in-title')
    expect(ruleIds).toContain('empty-meta-content')
    expect(ruleIds).toContain('twitter-handle-missing-at')
    expect(ruleIds).toContain('preload-font-crossorigin')
  })

  it('reports diagnostics with file-relative line numbers in .vue files', async () => {
    const results = await runAudit({
      patterns: ['bad.vue'],
      mode: 'audit',
      cwd: fixturesDir,
    })
    const titleDiag = results[0].diagnostics.find(d => d.ruleId === 'html-in-title')!
    // The `title:` line is on line 5 of bad.vue (1-indexed, including the script tag).
    expect(titleDiag.line).toBeGreaterThan(1)
    expect(titleDiag.line).toBeLessThan(20)
  })

  it('emits zero diagnostics for clean source but reports head-call coverage', async () => {
    const results = await runAudit({
      patterns: ['clean.ts'],
      mode: 'audit',
      cwd: fixturesDir,
    })
    expect(results).toHaveLength(1)
    expect(results[0].diagnostics).toHaveLength(0)
    expect(results[0].headCalls.map(c => c.name)).toEqual(['useHead'])
  })

  it('summary aggregates errors and warnings by severity', async () => {
    const results = await runAudit({
      patterns: ['bad.ts'],
      mode: 'audit',
      cwd: fixturesDir,
    })
    const { errorCount, warningCount } = summarise(results)
    expect(errorCount).toBeGreaterThan(0)
    expect(warningCount).toBeGreaterThan(0)
  })

  it('audits app.head inside defineNuxtConfig', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'unhead-cli-nuxt-'))
    await writeFile(join(tmp, 'nuxt.config.ts'), `
import { defineNuxtConfig } from 'nuxt/config'
export default defineNuxtConfig({
  app: {
    head: {
      title: '<b>Bad</b>',
      meta: [
        { name: 'twitter:site', content: 'unjsio' },
      ],
    },
  },
})
`)
    const results = await runAudit({
      patterns: ['nuxt.config.ts'],
      mode: 'audit',
      cwd: tmp,
    })
    expect(results).toHaveLength(1)
    const ruleIds = results[0].diagnostics.map(d => d.ruleId).sort()
    expect(ruleIds).toContain('html-in-title')
    expect(ruleIds).toContain('twitter-handle-missing-at')
    expect(results[0].headCalls.map(c => c.name)).toEqual(['defineNuxtConfig'])
  })

  it('surfaces parse errors as a diagnostic instead of silently skipping', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'unhead-cli-parse-'))
    await writeFile(join(tmp, 'broken.ts'), 'useHead({ title: \'oops\' )) // unbalanced\n')
    const results = await runAudit({
      patterns: ['broken.ts'],
      mode: 'audit',
      cwd: tmp,
    })
    expect(results).toHaveLength(1)
    const ruleIds = results[0].diagnostics.map(d => d.ruleId)
    expect(ruleIds).toContain('parse-error')
  })
})

describe('runAudit (migrate)', () => {
  let tmp: string

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'unhead-cli-'))
    const src = await readFile(join(fixturesDir, 'migrate-input.ts'), 'utf8')
    await writeFile(join(tmp, 'input.ts'), src)
  })

  afterEach(async () => {
    // Best-effort cleanup; tmp dir leaking on failure isn't worth a try/catch.
  })

  it('rewrites deprecated props', async () => {
    const results = await runAudit({
      patterns: ['input.ts'],
      mode: 'migrate',
      cwd: tmp,
    })
    const out = results[0].output!
    expect(out).toContain(`innerHTML: 'console.log(1)'`)
    expect(out).not.toContain('children:')
    expect(out).toContain(`tagPosition: 'bodyClose'`)
    expect(out).not.toContain('body: true')
  })

  it('removes redundant defer on module scripts', async () => {
    const results = await runAudit({
      patterns: ['input.ts'],
      mode: 'migrate',
      cwd: tmp,
    })
    const out = results[0].output!
    // Should keep type: 'module' but drop defer: true
    expect(out).toMatch(/type:\s*'module'\s*\}/)
  })

  it('inserts crossorigin on font preloads', async () => {
    const results = await runAudit({
      patterns: ['input.ts'],
      mode: 'migrate',
      cwd: tmp,
    })
    const out = results[0].output!
    expect(out).toContain(`crossorigin: 'anonymous'`)
  })

  it('prefixes twitter handle with @', async () => {
    const results = await runAudit({
      patterns: ['input.ts'],
      mode: 'migrate',
      cwd: tmp,
    })
    const out = results[0].output!
    // The fix uses JSON.stringify to safely escape arbitrary handle values,
    // so the literal lands as a double-quoted string. Tools like Prettier
    // will normalise back to project quote style on next save.
    expect(out).toContain(`"@unjsio"`)
    expect(out).not.toContain(`'unjsio'`)
  })

  it('renames hid → key', async () => {
    const results = await runAudit({
      patterns: ['input.ts'],
      mode: 'migrate',
      cwd: tmp,
    })
    const out = results[0].output!
    expect(out).toContain(`key: 'desc'`)
    expect(out).not.toContain(`hid: 'desc'`)
  })
})
