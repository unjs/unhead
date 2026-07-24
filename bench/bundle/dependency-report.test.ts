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

      | Package | External deps | Install size | Largest dependency |
      |---|---|---|---|
      | @unhead/vue | 18 | 29 MB | vue 2 MB |

      </details>

      <sub>Production dependencies only. Peer dependencies and Unhead workspace packages are excluded.</sub>"
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
})
