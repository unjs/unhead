import { describe, expect, it } from 'vitest'
import { renderDependencyReport } from './dependency-report'

const base = {
  packages: [
    {
      name: '@unhead/vue',
      dependencyCount: 42,
      dependencySize: 58_000_000,
      dependencies: [
        { name: 'vite', version: '8.1.5', size: 4_000_000 },
      ],
      skippedOptionalDependencies: [],
    },
  ],
}

describe('runtime dependency report', () => {
  it('surfaces dependency size and count changes', () => {
    const current = {
      packages: [
        {
          name: '@unhead/vue',
          dependencyCount: 18,
          dependencySize: 29_000_000,
          dependencies: [
            { name: 'vue', version: '3.5.40', size: 2_000_000 },
          ],
          skippedOptionalDependencies: [],
        },
      ],
    }

    expect(renderDependencyReport(base, current)).toMatchInlineSnapshot(`
      "### 📦 Runtime Dependencies

      🟢 **1 package smaller** · net -29 MB

      | Package | Install size | Dependencies | Δ |
      |---|---|---|---|
      | **@unhead/vue** | 58 MB → 29 MB | 42 → 18 | 🟢 -29 MB (-50.0%) |

      <details><summary>All packages (1)</summary>

      | Package | External deps | Install size | Largest dependency | Skipped optional |
      |---|---|---|---|---|
      | @unhead/vue | 18 | 29 MB | vue 2 MB | 0 |

      </details>

      <sub>Production dependencies only. Peer dependencies and Unhead workspace packages are excluded. Skipped optional dependencies are unavailable on the CI platform.</sub>"
    `)
  })

  it('reports an unchanged dependency graph', () => {
    expect(renderDependencyReport(base, base)).toContain('✅ **No runtime dependency changes**')
  })

  it('renders count-only growth without a negative zero size', () => {
    const current = {
      packages: [{
        ...base.packages[0],
        dependencyCount: base.packages[0].dependencyCount + 1,
      }],
    }

    expect(renderDependencyReport(base, current)).toContain('🔴 +1 dependency')
  })

  it('renders a neutral net dependency count when package changes cancel out', () => {
    const balancingBase = {
      packages: [
        { ...base.packages[0], name: 'a', dependencyCount: 1 },
        { ...base.packages[0], name: 'b', dependencyCount: 2 },
      ],
    }
    const current = {
      packages: [
        { ...balancingBase.packages[0], dependencyCount: 2 },
        { ...balancingBase.packages[1], dependencyCount: 1 },
      ],
    }

    expect(renderDependencyReport(balancingBase, current)).toContain('net 0 dependencies')
  })

  it('surfaces skipped optional dependencies by package', () => {
    const current = {
      packages: [{
        ...base.packages[0],
        skippedOptionalDependencies: [
          'oxc-parser -> @oxc-parser/binding-darwin-arm64',
        ],
      }],
    }
    const report = renderDependencyReport(null, current)

    expect(report).toContain('| @unhead/vue | 42 | 58 MB | vite 4 MB | 1 |')
    expect(report).toContain('@unhead/vue: `oxc-parser -> @oxc-parser/binding-darwin-arm64`')
  })
})
