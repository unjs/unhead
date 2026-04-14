import type { Rule } from '../src/migrate/types'
import MagicString from 'magic-string'
import { describe, expect, it } from 'vitest'
import { createLocationResolver } from '../src/migrate/location'
import { parseAndDispatch } from '../src/migrate/parser'
import { createReport } from '../src/migrate/report'
import {
  metaContentUndefined,
  propBodyTrue,
  propChildren,
  propHid,
  propRenderPriority,
  propVmid,
} from '../src/migrate/rules/prop-renames'

function run(code: string, rules: Rule[]): { output: string, report: ReturnType<typeof createReport> } {
  const s = new MagicString(code)
  const report = createReport()
  const ctx = {
    file: 'test.ts',
    code,
    s,
    framework: 'unknown' as const,
    resolveLocation: createLocationResolver(code),
    report(entry: any) {
      report.add({ ...entry, file: 'test.ts' })
    },
  }
  parseAndDispatch({ rules, ctx })
  return { output: s.toString(), report }
}

describe('prop-hid', () => {
  it('renames hid to key inside head tag arrays', () => {
    const code = `import { useHead } from 'unhead'
useHead({ link: [{ hid: 'x', rel: 'canonical', href: '/a' }] })`
    const { output, report } = run(code, [propHid])
    expect(output).toContain(`{ key: 'x', rel: 'canonical', href: '/a' }`)
    expect(report.countBy('prop-hid')).toBe(1)
  })

  it('does not touch hid outside a head call', () => {
    const code = `const x = { hid: 'y' }`
    const { output, report } = run(code, [propHid])
    expect(output).toBe(code)
    expect(report.entries).toHaveLength(0)
  })
})

describe('prop-vmid', () => {
  it('renames vmid to key', () => {
    const code = `import { useHead } from '@unhead/vue'
useHead({ meta: [{ vmid: 'desc', name: 'description', content: 'hi' }] })`
    const { output } = run(code, [propVmid])
    expect(output).toContain(`{ key: 'desc'`)
  })
})

describe('prop-children', () => {
  it('renames children to innerHTML on script tags', () => {
    const code = `import { useHead } from 'unhead'
useHead({ script: [{ children: 'console.log(1)' }] })`
    const { output } = run(code, [propChildren])
    expect(output).toContain(`{ innerHTML: 'console.log(1)' }`)
  })
})

describe('prop-body-true', () => {
  it('rewrites body: true to tagPosition bodyClose', () => {
    const code = `import { useHead } from 'unhead'
useHead({ script: [{ src: '/s.js', body: true }] })`
    const { output, report } = run(code, [propBodyTrue])
    expect(output).toContain(`tagPosition: 'bodyClose'`)
    expect(output).not.toContain('body: true')
    expect(report.countBy('prop-body-true')).toBe(1)
  })

  it('drops redundant body: false', () => {
    const code = `import { useHead } from 'unhead'
useHead({ script: [{ src: '/s.js', body: false }] })`
    const { output } = run(code, [propBodyTrue])
    expect(output).not.toContain('body: false')
    expect(output).toContain(`{ src: '/s.js' }`)
  })

  it('flags dynamic body values without autofixing', () => {
    const code = `import { useHead } from 'unhead'
useHead({ script: [{ src: '/s.js', body: isClient }] })`
    const { output, report } = run(code, [propBodyTrue])
    expect(output).toBe(code)
    const entry = report.entries.find(e => e.ruleId === 'prop-body-true')!
    expect(entry.fixed).toBe(false)
  })
})

describe('prop-render-priority', () => {
  it('renames renderPriority to tagPriority', () => {
    const code = `import { useHead } from 'unhead'
useHead({ script: [{ src: '/s.js', renderPriority: 10 }] })`
    const { output } = run(code, [propRenderPriority])
    expect(output).toContain('tagPriority: 10')
    expect(output).not.toContain('renderPriority')
  })
})

describe('meta-content-undefined', () => {
  it('rewrites content: undefined to content: null', () => {
    const code = `import { useHead } from 'unhead'
useHead({ meta: [{ name: 'description', content: undefined }] })`
    const { output } = run(code, [metaContentUndefined])
    expect(output).toContain(`content: null`)
    expect(output).not.toContain('content: undefined')
  })

  it('leaves non-meta tags alone', () => {
    const code = `import { useHead } from 'unhead'
useHead({ link: [{ rel: 'canonical', content: undefined }] })`
    const { output } = run(code, [metaContentUndefined])
    expect(output).toBe(code)
  })
})

describe('useSeoMeta target', () => {
  it('renames hid inside useSeoMeta object', () => {
    const code = `import { useSeoMeta } from 'unhead'
useSeoMeta({ description: 'x' })`
    // useSeoMeta doesn't use hid but we still want dispatch to run safely without crashing.
    const { output, report } = run(code, [propHid])
    expect(output).toBe(code)
    expect(report.entries).toHaveLength(0)
  })
})

describe('integration: all batch-1 rules together', () => {
  it('applies multiple rewrites in one pass', () => {
    const code = `import { useHead } from 'unhead'
useHead({
  script: [{ src: '/s.js', body: true, renderPriority: 5 }],
  meta: [{ vmid: 'd', name: 'description', content: undefined }],
  link: [{ hid: 'c', rel: 'canonical', href: '/' }],
})`
    const { output } = run(code, [
      propHid,
      propVmid,
      propChildren,
      propBodyTrue,
      propRenderPriority,
      metaContentUndefined,
    ])
    expect(output).toContain(`tagPosition: 'bodyClose'`)
    expect(output).toContain('tagPriority: 5')
    expect(output).toContain(`{ key: 'd', name: 'description', content: null }`)
    expect(output).toContain(`{ key: 'c', rel: 'canonical', href: '/' }`)
  })
})
