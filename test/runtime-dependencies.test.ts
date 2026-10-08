import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  name: string
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
}

interface PackageContract {
  buildDependencies: string[]
  packageDir: string
  runtimeDependencies: string[]
}

const contracts: PackageContract[] = [
  {
    packageDir: 'unhead',
    runtimeDependencies: ['hookable'],
    buildDependencies: ['unplugin'],
  },
  {
    packageDir: 'vue',
    runtimeDependencies: ['unhead'],
    buildDependencies: ['@unhead/bundler', 'unplugin'],
  },
  ...['react', 'solid-js', 'svelte'].map(packageDir => ({
    packageDir,
    runtimeDependencies: ['unhead'],
    buildDependencies: ['@unhead/bundler', 'magic-string', 'oxc-walker', 'unplugin'],
  })),
]

function readPackage(packageDir: string): PackageJson {
  return JSON.parse(
    readFileSync(resolve(import.meta.dirname, `../packages/${packageDir}/package.json`), 'utf8'),
  ) as PackageJson
}

describe('runtime dependency contracts', () => {
  for (const contract of contracts) {
    const packageJson = readPackage(contract.packageDir)

    it(`${packageJson.name} keeps build tooling optional`, () => {
      expect(Object.keys(packageJson.dependencies || {}).sort()).toEqual(contract.runtimeDependencies)

      for (const dependency of contract.buildDependencies) {
        expect(packageJson.peerDependencies).toHaveProperty(dependency)
        expect(packageJson.peerDependenciesMeta?.[dependency]).toEqual({ optional: true })
        expect(packageJson.devDependencies).toHaveProperty(dependency)
      }
    })
  }
})
