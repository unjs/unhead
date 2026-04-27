import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { describe, expect, it } from 'vitest'
import { runAudit } from '../src/oxc/audit'

async function project(files: Record<string, string>): Promise<string> {
  const tmp = await mkdtemp(join(tmpdir(), 'unhead-cli-psm-'))
  for (const [rel, content] of Object.entries(files)) {
    const path = join(tmp, rel)
    await mkdir(join(path, '..'), { recursive: true })
    await writeFile(path, content)
  }
  return tmp
}

describe('prefer-use-seo-meta', () => {
  it('emits info for meta-only useHead with title + description + og', async () => {
    const tmp = await project({
      'page.ts': `useHead({
  title: 'Hello',
  meta: [
    { name: 'description', content: 'Desc' },
    { property: 'og:title', content: 'OG Title' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
})
`,
    })
    const results = await runAudit({ patterns: ['page.ts'], mode: 'audit', cwd: tmp })
    const diag = results[0]?.diagnostics.find(d => d.ruleId === 'prefer-use-seo-meta')
    expect(diag).toBeDefined()
    expect(diag!.severity).toBe('warning')
  })

  it('does not fire when useHead has link/script/htmlAttrs', async () => {
    const tmp = await project({
      'page.ts': `useHead({
  title: 'Hello',
  link: [{ rel: 'canonical', href: '/x' }],
  meta: [{ name: 'description', content: 'D' }],
})
`,
    })
    const results = await runAudit({ patterns: ['page.ts'], mode: 'audit', cwd: tmp })
    expect(results[0]?.diagnostics.find(d => d.ruleId === 'prefer-use-seo-meta')).toBeUndefined()
  })

  it('does not fire on meta entries with extra attributes (media, key, …)', async () => {
    const tmp = await project({
      'page.ts': `useHead({
  meta: [{ name: 'theme-color', content: '#fff', media: '(prefers-color-scheme: light)' }],
})
`,
    })
    const results = await runAudit({ patterns: ['page.ts'], mode: 'audit', cwd: tmp })
    expect(results[0]?.diagnostics.find(d => d.ruleId === 'prefer-use-seo-meta')).toBeUndefined()
  })

  it('migrate mode rewrites useHead to useSeoMeta', async () => {
    const tmp = await project({
      'page.ts': `useHead({
  title: 'Hello',
  meta: [
    { name: 'description', content: 'Desc' },
    { property: 'og:image', content: '/og.png' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
})
`,
    })
    const results = await runAudit({ patterns: ['page.ts'], mode: 'migrate', cwd: tmp })
    const out = results[0].output!
    expect(out).toContain('useSeoMeta')
    expect(out).not.toMatch(/\buseHead\b/)
    expect(out).toContain(`title: 'Hello'`)
    expect(out).toContain(`description: 'Desc'`)
    expect(out).toContain(`ogImage: '/og.png'`)
    expect(out).toContain(`twitterCard: 'summary_large_image'`)
  })

  it('preserves dynamic content expressions in the rewrite', async () => {
    const tmp = await project({
      'page.ts': `const route = { path: '/x' }
useHead({
  meta: [{ name: 'description', content: route.path }],
})
`,
    })
    const results = await runAudit({ patterns: ['page.ts'], mode: 'migrate', cwd: tmp })
    const out = results[0].output!
    expect(out).toContain('description: route.path')
  })

  it('does not fire when meta-only useHead has only title and no meta entries', async () => {
    const tmp = await project({
      'page.ts': `useHead({ title: 'Hello' })\n`,
    })
    const results = await runAudit({ patterns: ['page.ts'], mode: 'audit', cwd: tmp })
    expect(results[0]?.diagnostics.find(d => d.ruleId === 'prefer-use-seo-meta')).toBeUndefined()
  })
})
