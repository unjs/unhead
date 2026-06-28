import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as yaml from 'js-yaml'
import { x } from 'tinyexec'
import { describe, expect, it } from 'vitest'
import { getPackageExportsManifest } from 'vitest-package-exports'

interface WorkspacePackage {
  name: string
  path: string
  private?: boolean
}

interface PackageJson {
  exports?: Record<string, unknown>
  types?: string
  typings?: string
}

function hasTypesExport(value: unknown): value is { types: string } {
  return !!value && typeof value === 'object' && !Array.isArray(value) && typeof (value as { types?: unknown }).types === 'string'
}

describe('exports-snapshot', async () => {
  const packages: WorkspacePackage[] = JSON.parse(
    await x('pnpm', ['ls', '-r', '--json', '--depth', '-1']).then(r => r.stdout),
  )

  for (const pkg of packages) {
    if (pkg.private || pkg.path.includes('packages-aliased') || pkg.path.includes('angular'))
      continue
    it(`${pkg.name}`, async () => {
      const manifest = await getPackageExportsManifest({
        importMode: 'dist',
        cwd: pkg.path,
      })
      await expect(yaml.dump(manifest.exports, { sortKeys: (a, b) => a.localeCompare(b) }))
        .toMatchFileSnapshot(`./exports/${pkg.name.split('/').pop()}.yaml`)
    })
  }
})

describe('package type paths', async () => {
  const packages: WorkspacePackage[] = JSON.parse(
    await x('pnpm', ['ls', '-r', '--json', '--depth', '-1']).then(r => r.stdout),
  )

  for (const pkg of packages) {
    if (pkg.private || pkg.path.includes('packages-aliased'))
      continue
    it(`${pkg.name} references existing type files`, () => {
      const packageJson = JSON.parse(readFileSync(join(pkg.path, 'package.json'), 'utf8')) as PackageJson
      const typePaths: { label: string, path: string }[] = []

      if (packageJson.types)
        typePaths.push({ label: 'types', path: packageJson.types })
      if (packageJson.typings)
        typePaths.push({ label: 'typings', path: packageJson.typings })

      for (const [name, value] of Object.entries(packageJson.exports || {})) {
        if (hasTypesExport(value))
          typePaths.push({ label: `exports ${name}`, path: value.types })
      }

      const missing = typePaths
        .filter(typePath => !existsSync(join(pkg.path, typePath.path)))
        .map(typePath => `${typePath.label}: ${typePath.path}`)
      expect(missing).toEqual([])
    })
  }
})
