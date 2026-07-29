import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
}

const packageJson = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf8'),
) as PackageJson

describe('@unhead/bundler package', () => {
  it('installs oxc-parser as the fallback parser', () => {
    expect(packageJson.dependencies).toHaveProperty('oxc-parser')
    expect(packageJson.peerDependencies).not.toHaveProperty('oxc-parser')
    expect(packageJson.peerDependenciesMeta).not.toHaveProperty('oxc-parser')
    expect(packageJson.devDependencies).not.toHaveProperty('oxc-parser')
  })

  it('keeps Vite DevTools packages optional', () => {
    const runtimeDependencies = {
      ...packageJson.dependencies,
      ...packageJson.optionalDependencies,
    }

    expect(Object.keys(runtimeDependencies).filter(name => name.startsWith('@vitejs/devtools'))).toEqual([])
    expect(packageJson.peerDependencies?.['@vitejs/devtools-kit']).toBeDefined()
    expect(packageJson.peerDependenciesMeta?.['@vitejs/devtools-kit']).toEqual({ optional: true })
    expect(packageJson.devDependencies?.['@vitejs/devtools-kit']).toBeDefined()
  })
  it('does not ship unused runtime dependencies', () => {
    expect(packageJson.dependencies).not.toHaveProperty('ufo')
  })
})
