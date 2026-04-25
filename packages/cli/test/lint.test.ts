import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'pathe'
import { describe, expect, it } from 'vitest'
import { runLint } from '../src/lint'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = resolve(__dirname, 'fixtures')

describe('runLint', () => {
  it('audit reports issues from the recommended config', async () => {
    const { results, errorCount, warningCount } = await runLint({
      patterns: ['**/*.ts'],
      mode: 'audit',
      cwd: fixturesDir,
    })

    expect(results).toHaveLength(1)
    const ruleIds = results[0].messages.map(m => m.ruleId).sort()
    expect(ruleIds).toEqual([
      '@unhead/defer-on-module-script',
      '@unhead/no-html-in-title',
      '@unhead/non-absolute-canonical',
      '@unhead/preload-font-crossorigin',
      '@unhead/robots-conflict',
      '@unhead/twitter-handle-missing-at',
    ].sort())
    expect(errorCount + warningCount).toBeGreaterThan(0)
  })
})
