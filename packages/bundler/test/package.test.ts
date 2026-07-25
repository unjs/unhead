import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
}

const packageJson = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf8'),
) as PackageJson

describe('@unhead/bundler package', () => {
  it('keeps oxc-parser as an optional fallback', () => {
    expect(packageJson.dependencies).not.toHaveProperty('oxc-parser')
    expect(packageJson.peerDependencies).toHaveProperty('oxc-parser')
    expect(packageJson.peerDependenciesMeta?.['oxc-parser']).toEqual({ optional: true })
    expect(packageJson.devDependencies).toHaveProperty('oxc-parser')
  })
})
